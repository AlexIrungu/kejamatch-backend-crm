import Lead from '../models/LeadModel.js';
import Property from '../models/PropertyModel.js';
import User from '../models/UserModel.js';
import logger from '../utils/logger.js';

/**
 * Analytics Controller
 * Provides comprehensive analytics for CRM dashboard
 */

// ============================================
// CONVERSION FUNNEL ANALYTICS
// ============================================

export const getConversionFunnel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // Get counts for each stage
    const [total, contacted, qualified, viewing, negotiating, won, lost] = await Promise.all([
      Lead.countDocuments(query),
      Lead.countDocuments({ ...query, status: { $in: ['contacted', 'qualified', 'viewing', 'negotiating', 'won'] } }),
      Lead.countDocuments({ ...query, status: { $in: ['qualified', 'viewing', 'negotiating', 'won'] } }),
      Lead.countDocuments({ ...query, status: { $in: ['viewing', 'negotiating', 'won'] } }),
      Lead.countDocuments({ ...query, status: { $in: ['negotiating', 'won'] } }),
      Lead.countDocuments({ ...query, status: 'won' }),
      Lead.countDocuments({ ...query, status: 'lost' }),
    ]);

    // Calculate conversion rates
    const funnel = {
      stages: [
        {
          name: 'Total Leads',
          count: total,
          percentage: 100,
          dropoff: 0,
        },
        {
          name: 'Contacted',
          count: contacted,
          percentage: total > 0 ? ((contacted / total) * 100).toFixed(1) : 0,
          dropoff: total - contacted,
        },
        {
          name: 'Qualified',
          count: qualified,
          percentage: contacted > 0 ? ((qualified / contacted) * 100).toFixed(1) : 0,
          dropoff: contacted - qualified,
        },
        {
          name: 'Viewing',
          count: viewing,
          percentage: qualified > 0 ? ((viewing / qualified) * 100).toFixed(1) : 0,
          dropoff: qualified - viewing,
        },
        {
          name: 'Negotiating',
          count: negotiating,
          percentage: viewing > 0 ? ((negotiating / viewing) * 100).toFixed(1) : 0,
          dropoff: viewing - negotiating,
        },
        {
          name: 'Won',
          count: won,
          percentage: negotiating > 0 ? ((won / negotiating) * 100).toFixed(1) : 0,
          dropoff: negotiating - won,
        },
      ],
      summary: {
        totalLeads: total,
        wonDeals: won,
        lostDeals: lost,
        overallConversionRate: total > 0 ? ((won / total) * 100).toFixed(1) : 0,
        averageDropoffRate: total > 0 ? (((total - won) / total) * 100).toFixed(1) : 0,
      },
    };

    res.status(200).json({ success: true, data: funnel });
  } catch (error) {
    logger.error('❌ Get conversion funnel error:', error);
    res.status(500).json({ success: false, message: 'Failed to get conversion funnel' });
  }
};

// ============================================
// LEAD SOURCE ANALYTICS
// ============================================

export const getLeadSourceBreakdown = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // Aggregate by source
    const sourceBreakdown = await Lead.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          won: {
            $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] },
          },
          lost: {
            $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] },
          },
          qualified: {
            $sum: { $cond: [{ $in: ['$status', ['qualified', 'viewing', 'negotiating', 'won']] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          source: '$_id',
          count: 1,
          won: 1,
          lost: 1,
          qualified: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$count', 0] },
              { $multiply: [{ $divide: ['$won', '$count'] }, 100] },
              0,
            ],
          },
          qualificationRate: {
            $cond: [
              { $gt: ['$count', 0] },
              { $multiply: [{ $divide: ['$qualified', '$count'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = sourceBreakdown.reduce((sum, item) => sum + item.count, 0);

    // Calculate percentages
    const sourcesWithPercentage = sourceBreakdown.map((item) => ({
      source: item.source || 'Unknown',
      count: item.count,
      percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : 0,
      won: item.won,
      lost: item.lost,
      qualified: item.qualified,
      conversionRate: parseFloat(item.conversionRate.toFixed(1)),
      qualificationRate: parseFloat(item.qualificationRate.toFixed(1)),
    }));

    res.status(200).json({
      success: true,
      data: {
        sources: sourcesWithPercentage,
        totalLeads: total,
      },
    });
  } catch (error) {
    logger.error('❌ Get lead source breakdown error:', error);
    res.status(500).json({ success: false, message: 'Failed to get lead source breakdown' });
  }
};

// ============================================
// AGENT PERFORMANCE ANALYTICS
// ============================================

export const getAgentPerformance = async (req, res) => {
  try {
    const { startDate, endDate, agentId } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get all agents
    const agents = await User.find({ role: 'agent', isActive: true }).select('_id name email');

    // Build match query
    const matchQuery = {};
    if (Object.keys(dateFilter).length > 0) {
      matchQuery.createdAt = dateFilter;
    }
    if (agentId) {
      matchQuery.assignedTo = agentId;
    }

    // Aggregate performance data
    const performanceData = await Promise.all(
      agents.map(async (agent) => {
        const agentMatch = { ...matchQuery, assignedTo: agent._id };

        // Get lead statistics
        const [totalLeads, won, lost, viewing, averageTimeToWon] = await Promise.all([
          Lead.countDocuments(agentMatch),
          Lead.countDocuments({ ...agentMatch, status: 'won' }),
          Lead.countDocuments({ ...agentMatch, status: 'lost' }),
          Lead.countDocuments({ ...agentMatch, status: { $in: ['viewing', 'negotiating'] } }),
          // Calculate average time from assignment to won
          Lead.aggregate([
            { $match: { ...agentMatch, status: 'won', assignedAt: { $exists: true } } },
            {
              $project: {
                timeToClose: {
                  $subtract: [
                    { $arrayElemAt: [{ $filter: { input: '$activities', cond: { $eq: ['$$this.type', 'status_change'] } } }, 0] }.createdAt || '$updatedAt',
                    '$assignedAt',
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgTime: { $avg: '$timeToClose' },
              },
            },
          ]),
        ]);

        // Get activity counts
        const activityCounts = await Lead.aggregate([
          { $match: agentMatch },
          { $unwind: '$activities' },
          {
            $group: {
              _id: '$activities.type',
              count: { $sum: 1 },
            },
          },
        ]);

        const activities = activityCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {});

        // Calculate metrics
        const conversionRate = totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : 0;
        const lossRate = totalLeads > 0 ? ((lost / totalLeads) * 100).toFixed(1) : 0;
        const avgDaysToClose =
          averageTimeToWon.length > 0 && averageTimeToWon[0]?.avgTime
            ? Math.round(averageTimeToWon[0].avgTime / (1000 * 60 * 60 * 24))
            : 0;

        return {
          agent: {
            id: agent._id,
            name: agent.name,
            email: agent.email,
          },
          metrics: {
            totalLeads,
            wonDeals: won,
            lostDeals: lost,
            activeDeals: viewing,
            conversionRate: parseFloat(conversionRate),
            lossRate: parseFloat(lossRate),
            averageDaysToClose: avgDaysToClose,
          },
          activities: {
            notes: activities.note_added || 0,
            calls: activities.call_logged || 0,
            emails: activities.email_sent || 0,
            viewings: activities.viewing_scheduled || 0,
          },
          performance: {
            responseTime: 'N/A', // Can be calculated if we track first contact time
            followUpRate: activities.note_added || 0 + activities.call_logged || 0,
          },
        };
      })
    );

    // Sort by won deals
    performanceData.sort((a, b) => b.metrics.wonDeals - a.metrics.wonDeals);

    // Calculate team averages
    const teamTotals = performanceData.reduce(
      (acc, agent) => ({
        totalLeads: acc.totalLeads + agent.metrics.totalLeads,
        wonDeals: acc.wonDeals + agent.metrics.wonDeals,
        lostDeals: acc.lostDeals + agent.metrics.lostDeals,
      }),
      { totalLeads: 0, wonDeals: 0, lostDeals: 0 }
    );

    const teamAverage = {
      conversionRate:
        teamTotals.totalLeads > 0
          ? ((teamTotals.wonDeals / teamTotals.totalLeads) * 100).toFixed(1)
          : 0,
      averageDaysToClose:
        performanceData.length > 0
          ? Math.round(
              performanceData.reduce((sum, a) => sum + a.metrics.averageDaysToClose, 0) /
                performanceData.length
            )
          : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        agents: performanceData,
        teamSummary: {
          totalLeads: teamTotals.totalLeads,
          wonDeals: teamTotals.wonDeals,
          lostDeals: teamTotals.lostDeals,
          teamConversionRate: parseFloat(teamAverage.conversionRate),
          teamAverageDaysToClose: teamAverage.averageDaysToClose,
        },
      },
    });
  } catch (error) {
    logger.error('❌ Get agent performance error:', error);
    res.status(500).json({ success: false, message: 'Failed to get agent performance' });
  }
};

// ============================================
// TIME-BASED TRENDS
// ============================================

export const getTimeTrends = async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Define grouping based on period
    let dateGrouping;
    let dateFormat;

    switch (period) {
      case 'hourly':
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' },
        };
        dateFormat = '%Y-%m-%d %H:00';
        break;
      case 'daily':
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateGrouping = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        dateFormat = '%Y-W%V';
        break;
      case 'monthly':
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        dateFormat = '%Y-%m';
        break;
      default:
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        dateFormat = '%Y-%m-%d';
    }

    // Aggregate leads over time
    const leadTrends = await Lead.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: dateGrouping,
          totalLeads: { $sum: 1 },
          newLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] },
          },
          qualified: {
            $sum: { $cond: [{ $in: ['$status', ['qualified', 'viewing', 'negotiating', 'won']] }, 1, 0] },
          },
          won: {
            $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] },
          },
          lost: {
            $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
    ]);

    // Format dates for response
    const formattedTrends = leadTrends.map((item) => {
      let dateLabel;
      if (period === 'weekly') {
        dateLabel = `${item._id.year}-W${item._id.week}`;
      } else if (period === 'monthly') {
        dateLabel = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      } else if (period === 'hourly') {
        dateLabel = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')} ${String(item._id.hour).padStart(2, '0')}:00`;
      } else {
        dateLabel = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      }

      return {
        date: dateLabel,
        totalLeads: item.totalLeads,
        newLeads: item.newLeads,
        qualified: item.qualified,
        won: item.won,
        lost: item.lost,
        conversionRate: item.totalLeads > 0 ? ((item.won / item.totalLeads) * 100).toFixed(1) : 0,
      };
    });

    // Calculate growth metrics
    const firstPeriod = formattedTrends[0];
    const lastPeriod = formattedTrends[formattedTrends.length - 1];

    const growth = {
      leadsGrowth:
        firstPeriod && lastPeriod && firstPeriod.totalLeads > 0
          ? (((lastPeriod.totalLeads - firstPeriod.totalLeads) / firstPeriod.totalLeads) * 100).toFixed(1)
          : 0,
      conversionGrowth:
        firstPeriod && lastPeriod && parseFloat(firstPeriod.conversionRate) > 0
          ? (
              ((parseFloat(lastPeriod.conversionRate) - parseFloat(firstPeriod.conversionRate)) /
                parseFloat(firstPeriod.conversionRate)) *
              100
            ).toFixed(1)
          : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        trends: formattedTrends,
        growth,
        period,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('❌ Get time trends error:', error);
    res.status(500).json({ success: false, message: 'Failed to get time trends' });
  }
};

// ============================================
// PROPERTY ANALYTICS
// ============================================

export const getPropertyAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // Get property statistics
    const [
      totalProperties,
      available,
      sold,
      rented,
      featured,
      avgPrice,
      totalViews,
      propertiesByType,
      propertiesByCategory,
      topViewedProperties,
    ] = await Promise.all([
      Property.countDocuments(query),
      Property.countDocuments({ ...query, status: 'available' }),
      Property.countDocuments({ ...query, status: 'sold' }),
      Property.countDocuments({ ...query, status: 'rented' }),
      Property.countDocuments({ ...query, featured: true }),
      Property.aggregate([
        { $match: { ...query, status: 'available' } },
        { $group: { _id: null, avgPrice: { $avg: '$price' } } },
      ]),
      Property.aggregate([{ $match: query }, { $group: { _id: null, totalViews: { $sum: '$views' } } }]),
      Property.aggregate([
        { $match: query },
        { $group: { _id: '$type', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
      ]),
      Property.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
      ]),
      Property.find(query).sort({ views: -1 }).limit(10).select('title views price type status location images'),
    ]);

    // Get viewing statistics from leads
    const viewingStats = await Lead.aggregate([
      { $match: { 'viewings.0': { $exists: true } } },
      { $unwind: '$viewings' },
      {
        $group: {
          _id: null,
          totalViewings: { $sum: 1 },
          scheduled: {
            $sum: { $cond: [{ $eq: ['$viewings.status', 'scheduled'] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$viewings.status', 'completed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$viewings.status', 'cancelled'] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProperties,
          available,
          sold,
          rented,
          featured,
          avgPrice: avgPrice.length > 0 ? Math.round(avgPrice[0].avgPrice) : 0,
          totalViews: totalViews.length > 0 ? totalViews[0].totalViews : 0,
        },
        byType: propertiesByType.map((item) => ({
          type: item._id,
          count: item.count,
          avgPrice: Math.round(item.avgPrice),
        })),
        byCategory: propertiesByCategory.map((item) => ({
          category: item._id,
          count: item.count,
          avgPrice: Math.round(item.avgPrice),
        })),
        topViewed: topViewedProperties,
        viewings: viewingStats.length > 0 ? viewingStats[0] : { totalViewings: 0, scheduled: 0, completed: 0, cancelled: 0 },
      },
    });
  } catch (error) {
    logger.error('❌ Get property analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to get property analytics' });
  }
};

// ============================================
// COMBINED DASHBOARD ANALYTICS
// ============================================

export const getDashboardAnalytics = async (req, res) => {
  try {
    const { period = 'daily', daysBack = 30 } = req.query;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Fetch all analytics in parallel
    const [funnelData, sourceData, agentData, trendData, propertyData] = await Promise.all([
      getConversionFunnelData(startDate, endDate),
      getLeadSourceData(startDate, endDate),
      getAgentPerformanceData(startDate, endDate),
      getTimeTrendsData(period, startDate, endDate),
      getPropertyAnalyticsData(startDate, endDate),
    ]);

    res.status(200).json({
      success: true,
      data: {
        conversionFunnel: funnelData,
        leadSources: sourceData,
        agentPerformance: agentData,
        trends: trendData,
        properties: propertyData,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('❌ Get dashboard analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to get dashboard analytics' });
  }
};

// Helper functions for combined analytics
async function getConversionFunnelData(startDate, endDate) {
  // Implementation similar to getConversionFunnel but returns data instead of response
  const query = { createdAt: { $gte: startDate, $lte: endDate } };
  const [total, contacted, qualified, viewing, negotiating, won] = await Promise.all([
    Lead.countDocuments(query),
    Lead.countDocuments({ ...query, status: { $in: ['contacted', 'qualified', 'viewing', 'negotiating', 'won'] } }),
    Lead.countDocuments({ ...query, status: { $in: ['qualified', 'viewing', 'negotiating', 'won'] } }),
    Lead.countDocuments({ ...query, status: { $in: ['viewing', 'negotiating', 'won'] } }),
    Lead.countDocuments({ ...query, status: { $in: ['negotiating', 'won'] } }),
    Lead.countDocuments({ ...query, status: 'won' }),
  ]);

  return {
    total,
    contacted,
    qualified,
    viewing,
    negotiating,
    won,
    conversionRate: total > 0 ? ((won / total) * 100).toFixed(1) : 0,
  };
}

async function getLeadSourceData(startDate, endDate) {
  const matchStage = { createdAt: { $gte: startDate, $lte: endDate } };
  const sources = await Lead.aggregate([
    { $match: matchStage },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return sources;
}

async function getAgentPerformanceData(startDate, endDate) {
  const agents = await User.find({ role: 'agent', isActive: true }).select('_id name');
  const agentMatch = { assignedAt: { $gte: startDate, $lte: endDate } };

  const performanceData = await Promise.all(
    agents.slice(0, 5).map(async (agent) => {
      const [totalLeads, won] = await Promise.all([
        Lead.countDocuments({ ...agentMatch, assignedTo: agent._id }),
        Lead.countDocuments({ ...agentMatch, assignedTo: agent._id, status: 'won' }),
      ]);

      return {
        agent: agent.name,
        totalLeads,
        won,
        conversionRate: totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : 0,
      };
    })
  );

  return performanceData;
}

async function getTimeTrendsData(period, startDate, endDate) {
  const dateGrouping = {
    year: { $year: '$createdAt' },
    month: { $month: '$createdAt' },
    day: { $dayOfMonth: '$createdAt' },
  };

  const trends = await Lead.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: dateGrouping,
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    { $limit: 30 },
  ]);

  return trends;
}

async function getPropertyAnalyticsData(startDate, endDate) {
  const query = { createdAt: { $gte: startDate, $lte: endDate } };
  const [total, available, totalViews] = await Promise.all([
    Property.countDocuments(query),
    Property.countDocuments({ ...query, status: 'available' }),
    Property.aggregate([{ $match: query }, { $group: { _id: null, totalViews: { $sum: '$views' } } }]),
  ]);

  return {
    total,
    available,
    totalViews: totalViews.length > 0 ? totalViews[0].totalViews : 0,
  };
}

export default {
  getConversionFunnel,
  getLeadSourceBreakdown,
  getAgentPerformance,
  getTimeTrends,
  getPropertyAnalytics,
  getDashboardAnalytics,
};