#!/bin/bash

# Test Script: Zero Active Counters Scenario
# Tests if queue number taking works when there are 0 active counters

echo "🧪 Zero Active Counters Test"
echo "============================"
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

# Function to get current active counters
get_active_counters() {
    local response=$(curl -s "$API_BASE_URL/queue/status/$BRANCH_ID")
    local active_counters=$(echo "$response" | grep -o '"activeCounters":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    echo "$active_counters"
}

# Function to get canTakeNumber status
get_can_take_number() {
    local response=$(curl -s "$API_BASE_URL/queue/status/$BRANCH_ID")
    local can_take_number=$(echo "$response" | grep -o '"canTakeNumber":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    echo "$can_take_number"
}

# Function to test taking queue number
test_take_queue_number() {
    local scenario="$1"
    echo -e "${BLUE}🎫 Testing take queue number ($scenario)...${NC}"
    
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

# Function to end all counter sessions (simulate 0 active counters)
end_all_counter_sessions() {
    echo -e "${YELLOW}🔄 Ending all counter sessions to simulate 0 active counters...${NC}"
    
    # Connect to database and end all active sessions
    # This simulates the scenario where no clerks are logged in
    cd "/Users/Shared/Mehmet/React/React Projects/queuematic08-junie"
    
    # Use psql to end all counter sessions
    PGPASSWORD="queuematic2024" psql -h localhost -U qm_user -d queuematic08 -c "UPDATE counter_sessions SET end_time = CURRENT_TIMESTAMP WHERE end_time IS NULL;" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ All counter sessions ended${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to end counter sessions${NC}"
        return 1
    fi
}

# Function to restore counter sessions
restore_counter_sessions() {
    echo -e "${YELLOW}🔄 Restoring counter sessions...${NC}"
    
    cd "/Users/Shared/Mehmet/React/React Projects/queuematic08-junie"
    
    # Restore one active session
    PGPASSWORD="queuematic2024" psql -h localhost -U qm_user -d queuematic08 -c "INSERT INTO counter_sessions (counter_id, user_id, start_time, end_time) VALUES (1, 2, CURRENT_TIMESTAMP, NULL);" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Counter sessions restored${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to restore counter sessions${NC}"
        return 1
    fi
}

# Main test execution
echo "📍 STEP 1: Testing with current active counters..."
initial_active_counters=$(get_active_counters)
initial_can_take_number=$(get_can_take_number)

echo "   Active Counters: $initial_active_counters"
echo "   Can Take Number: $initial_can_take_number"

if test_take_queue_number "WITH ACTIVE COUNTERS"; then
    initial_works=true
else
    initial_works=false
fi

echo ""
echo "📍 STEP 2: Creating 0 active counters scenario..."
if ! end_all_counter_sessions; then
    echo -e "${RED}💥 Cannot create 0 active counters scenario${NC}"
    exit 1
fi

# Wait a moment for the change to take effect
sleep 2

echo ""
echo "📍 STEP 3: Testing with 0 active counters..."
zero_active_counters=$(get_active_counters)
zero_can_take_number=$(get_can_take_number)

echo "   Active Counters: $zero_active_counters"
echo "   Can Take Number: $zero_can_take_number"

if test_take_queue_number "WITH ZERO ACTIVE COUNTERS"; then
    zero_works=true
else
    zero_works=false
fi

echo ""
echo "📍 STEP 4: Restoring counter sessions..."
restore_counter_sessions

# Wait a moment for the change to take effect
sleep 2

# Final analysis
echo ""
echo "🎯 FINAL ANALYSIS:"
echo "=================="
echo "Initial state (with active counters):"
echo "   Active Counters: $initial_active_counters"
echo "   Can Take Number: $initial_can_take_number"
echo "   Queue taking works: $initial_works"
echo ""
echo "Zero active counters state:"
echo "   Active Counters: $zero_active_counters"
echo "   Can Take Number: $zero_can_take_number"
echo "   Queue taking works: $zero_works"

# Check if the requirement is met
if [ "$zero_can_take_number" = "true" ] && [ "$zero_works" = "true" ]; then
    echo ""
    echo -e "${GREEN}✅ SUCCESS: Queue numbers can be taken regardless of active counters${NC}"
    echo "   - Backend correctly returns canTakeNumber: true even with 0 active counters"
    echo "   - API functionality works even with 0 active counters"
    echo "   - The requirement is satisfied: 'Aktif gişe olsa da olmasa da sıra numarası alınabilmeli'"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ISSUE: Queue number taking depends on active counters${NC}"
    echo "   - This violates the requirement for independence"
    echo "   - Need to fix the system to allow queue taking regardless of active counters"
    exit 1
fi