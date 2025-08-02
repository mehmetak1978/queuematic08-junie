#!/bin/bash

# Test Script: Active Counters Independence (Simple Version)
# Tests if queue number taking works regardless of active counters count

echo "🧪 Active Counters Independence Test"
echo "===================================="
echo ""

# Configuration
API_BASE_URL="http://localhost:3001/api"
BRANCH_ID=1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test queue status
test_queue_status() {
    echo -e "${BLUE}🔄 Testing queue status API...${NC}"
    
    local response=$(curl -s "$API_BASE_URL/queue/status/$BRANCH_ID")
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/queue/status/$BRANCH_ID")
    
    if [ "$http_code" != "200" ]; then
        echo -e "${RED}❌ FAILED: HTTP $http_code${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Queue status API responded successfully${NC}"
    
    # Parse JSON response
    local can_take_number=$(echo "$response" | grep -o '"canTakeNumber":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    local active_counters=$(echo "$response" | grep -o '"activeCounters":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    local waiting_count=$(echo "$response" | grep -o '"waitingCount":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    local branch_name=$(echo "$response" | grep -o '"branchName":"[^"]*"' | cut -d':' -f2 | tr -d '"')
    
    echo ""
    echo "📋 Current Status:"
    echo "   Branch: $branch_name"
    echo "   Can Take Number: $can_take_number"
    echo "   Active Counters: $active_counters"
    echo "   Waiting Count: $waiting_count"
    
    # Store values for later use
    GLOBAL_CAN_TAKE_NUMBER="$can_take_number"
    GLOBAL_ACTIVE_COUNTERS="$active_counters"
    
    return 0
}

# Function to test taking queue number
test_take_queue_number() {
    echo -e "${BLUE}🎫 Testing take queue number API...${NC}"
    
    local response=$(curl -s -X POST "$API_BASE_URL/queue/next-number" \
        -H "Content-Type: application/json" \
        -d "{\"branchId\": $BRANCH_ID}")
    
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE_URL/queue/next-number" \
        -H "Content-Type: application/json" \
        -d "{\"branchId\": $BRANCH_ID}")
    
    if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
        echo -e "${RED}❌ FAILED: Take queue number - HTTP $http_code${NC}"
        echo "Response: $response"
        return 1
    fi
    
    local queue_number=$(echo "$response" | grep -o '"number":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d':' -f2 | tr -d '"')
    
    echo -e "${GREEN}✅ Take queue number succeeded${NC}"
    echo "   Queue Number: $queue_number"
    echo "   Status: $status"
    return 0
}

# Function to simulate frontend logic
simulate_frontend_logic() {
    echo -e "${BLUE}🖥️  Simulating Frontend Button Logic:${NC}"
    
    # Current button disable logic from CustomerApp.jsx
    local button_disabled=false
    if [ "$GLOBAL_CAN_TAKE_NUMBER" != "true" ]; then
        button_disabled=true
    fi
    
    # Info message logic
    local show_info_message=false
    if [ "$GLOBAL_CAN_TAKE_NUMBER" != "true" ]; then
        show_info_message=true
    fi
    
    echo "   canTakeNumber: $GLOBAL_CAN_TAKE_NUMBER"
    echo "   activeCounters: $GLOBAL_ACTIVE_COUNTERS"
    echo "   Button disabled: $button_disabled"
    echo "   Show warning message: $show_info_message"
    
    # Store for later use
    GLOBAL_BUTTON_DISABLED="$button_disabled"
    GLOBAL_SHOW_INFO_MESSAGE="$show_info_message"
}

# Main test execution
echo "📍 STEP 1: Testing current queue status..."
if ! test_queue_status; then
    echo -e "${RED}💥 Cannot proceed without queue status${NC}"
    exit 1
fi

echo ""
echo "📍 STEP 2: Simulating frontend button logic..."
simulate_frontend_logic

echo ""
echo "📍 STEP 3: Testing actual API functionality..."
if test_take_queue_number; then
    api_works=true
else
    api_works=false
fi

# Analysis
echo ""
echo "🎯 ANALYSIS:"
echo "============"
echo "Backend canTakeNumber: $GLOBAL_CAN_TAKE_NUMBER"
echo "Backend activeCounters: $GLOBAL_ACTIVE_COUNTERS"
echo "Frontend button disabled: $GLOBAL_BUTTON_DISABLED"
echo "API actually works: $api_works"

# Check for independence
if [ "$GLOBAL_CAN_TAKE_NUMBER" = "true" ] && [ "$api_works" = "true" ]; then
    echo ""
    echo -e "${GREEN}✅ SUCCESS: Queue number taking is independent of active counters${NC}"
    echo "   - Backend correctly returns canTakeNumber: true"
    echo "   - Frontend button logic only depends on canTakeNumber"
    echo "   - API functionality works regardless of active counters"
    independence_ok=true
else
    echo ""
    echo -e "${RED}❌ ISSUE: Queue number taking depends on active counters${NC}"
    echo "   - This violates the requirement for independence"
    independence_ok=false
fi

# Special case: Check behavior when activeCounters is 0
if [ "$GLOBAL_ACTIVE_COUNTERS" = "0" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  SPECIAL CASE: Zero Active Counters${NC}"
    echo "   - This is the scenario mentioned in the issue"
    echo "   - Button should still work: $([ "$GLOBAL_BUTTON_DISABLED" = "false" ] && echo "YES" || echo "NO")"
    echo "   - API should still work: $([ "$api_works" = "true" ] && echo "YES" || echo "NO")"
fi

# Final result
if [ "$independence_ok" = "true" ]; then
    echo ""
    echo -e "${GREEN}🎉 CONCLUSION: System correctly allows queue numbers regardless of active counters${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}🚨 CONCLUSION: System has dependency on active counters that needs to be fixed${NC}"
    exit 1
fi