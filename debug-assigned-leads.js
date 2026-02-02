/**
 * Debug script to check assigned leads issue
 * Run with: node debug-assigned-leads.js
 */

import mongoose from 'mongoose';
import Lead from './src/models/LeadModel.js';
import { userStorage } from './src/services/userStorageMongo.js';

const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri-here';

async function debugAssignedLeads() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all agents
    const agents = await userStorage.getAllUsers();
    const agentUsers = agents.filter(u => u.role === 'agent');
    
    console.log('📋 Agents in system:');
    agentUsers.forEach(agent => {
      console.log(`  - ${agent.name} (${agent.email})`);
      console.log(`    ID: ${agent._id}`);
      console.log(`    ID Type: ${typeof agent._id}`);
      console.log(`    ID toString: ${agent._id.toString()}\n`);
    });

    // Get all leads
    const leads = await Lead.find({});
    console.log(`\n📊 Total leads in database: ${leads.length}\n`);

    // Check each lead's assignedTo field
    console.log('🔍 Checking assignedTo fields:\n');
    leads.forEach((lead, index) => {
      console.log(`Lead ${index + 1}: ${lead.name} (${lead.email})`);
      console.log(`  ID: ${lead._id}`);
      console.log(`  assignedTo: ${lead.assignedTo}`);
      console.log(`  assignedTo Type: ${typeof lead.assignedTo}`);
      console.log(`  assignedTo is ObjectId: ${lead.assignedTo instanceof mongoose.Types.ObjectId}`);
      
      if (lead.assignedTo) {
        console.log(`  assignedTo toString: ${lead.assignedTo.toString()}`);
        
        // Try to match with agents
        const matchedAgent = agentUsers.find(a => 
          a._id.toString() === lead.assignedTo.toString()
        );
        
        if (matchedAgent) {
          console.log(`  ✅ MATCHED to agent: ${matchedAgent.name} (${matchedAgent.email})`);
        } else {
          console.log(`  ❌ NO MATCH FOUND - This is the problem!`);
          console.log(`  Trying different comparisons:`);
          agentUsers.forEach(a => {
            console.log(`    - Agent ${a.name}:`);
            console.log(`      String compare: ${a._id.toString() === lead.assignedTo.toString()}`);
            console.log(`      Direct compare: ${a._id.equals ? a._id.equals(lead.assignedTo) : 'N/A'}`);
          });
        }
      } else {
        console.log(`  ⚠️  Not assigned to anyone`);
      }
      console.log('');
    });

    // Now test the filter logic from agentRoutes
    console.log('\n🧪 Testing filter logic from agentRoutes.js:\n');
    for (const agent of agentUsers) {
      console.log(`Testing for agent: ${agent.name} (${agent.email})`);
      console.log(`Agent ID: ${agent._id.toString()}`);
      
      const filteredLeads = leads.filter(l => 
        l.assignedTo && l.assignedTo.toString() === agent._id.toString()
      );
      
      console.log(`Leads found: ${filteredLeads.length}`);
      if (filteredLeads.length > 0) {
        filteredLeads.forEach(lead => {
          console.log(`  - ${lead.name} (${lead.email})`);
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

debugAssignedLeads();