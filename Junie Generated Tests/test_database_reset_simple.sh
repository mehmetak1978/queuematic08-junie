#!/bin/bash

# Test Script: Database Reset Button Issue (Simple Version)
# Tests if "Sıra Numarası AL" button becomes inactive after database reset

echo "🧪 Database Reset Button Issue Test"
echo "====================================="
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
    local step_name="$1"
    echo -e "${BLUE}📊 Testing Queue Status API ($step_name)...${NC}"
    
    local response=$(curl -s "$API_BASE_URL/queue/status/$BRANCH_ID")
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/queue/status/$BRANCH_ID")
    
    if [ "$http_code" != "200" ]; then
        echo -e "${RED}❌ FAILED: HTTP $http_code${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ SUCCESS: Queue status API responded${NC}"
    
    # Parse JSON response (basic parsing)
    local can_take_number=$(echo "$response" | grep -o '"canTakeNumber":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    local active_counters=$(echo "$response" | grep -o '"activeCounters":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    local waiting_count=$(echo "$response" | grep -o '"waitingCount":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    local branch_name=$(echo "$response" | grep -o '"branchName":"[^"]*"' | cut -d':' -f2 | tr -d '"')
    
    echo ""
    echo "📋 Queue Status Response ($step_name):"
    echo "   Branch Name: $branch_name"
    echo "   Can Take Number: $can_take_number"
    echo "   Active Counters: $active_counters"
    echo "   Waiting Count: $waiting_count"
    
    echo ""
    echo "🎯 Button State Analysis ($step_name):"
    if [ "$can_take_number" = "true" ]; then
        echo -e "   Button should be: ${GREEN}ACTIVE${NC}"
        echo -e "   Warning message should be: ${GREEN}HIDDEN${NC}"
        return 0
    else
        echo -e "   Button should be: ${RED}INACTIVE${NC}"
        echo -e "   Warning message should be: ${RED}SHOWN${NC}"
        return 1
    fi
}

# Function to test taking queue number
test_take_queue_number() {
    local step_name="$1"
    echo -e "${BLUE}🎫 Testing Take Queue Number API ($step_name)...${NC}"
    
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
    
    echo -e "${GREEN}✅ SUCCESS: Take queue number${NC}"
    echo "   Queue Number: $queue_number"
    echo "   Status: $status"
    return 0
}

# Function to reset database
reset_database() {
    echo -e "${YELLOW}🔄 Resetting database...${NC}"
    
    cd "/Users/Shared/Mehmet/React/React Projects/queuematic08-junie"
    
    # Run the database setup script
    local output=$(node backend/src/database/setup.js 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Database reset completed${NC}"
        echo "📄 Setup output (last few lines):"
        echo "$output" | tail -5
        return 0
    else
        echo -e "${RED}❌ Database reset failed${NC}"
        echo "📄 Error output:"
        echo "$output"
        return 1
    fi
}

# Main test execution
echo "📍 STEP 1: Testing initial button state..."
if test_queue_status "BEFORE RESET"; then
    initial_button_active=true
    echo -e "${GREEN}✅ Initial state: Button is ACTIVE${NC}"
else
    initial_button_active=false
    echo -e "${RED}❌ Initial state: Button is INACTIVE${NC}"
fi

echo ""
echo "📍 STEP 2: Testing queue number taking before reset..."
if test_take_queue_number "BEFORE RESET"; then
    can_take_before=true
else
    can_take_before=false
fi

echo ""
echo "📍 STEP 3: Resetting database..."
if ! reset_database; then
    echo -e "${RED}💥 Database reset failed, cannot continue test${NC}"
    exit 1
fi

echo ""
echo "⏳ Waiting 3 seconds for database to be ready..."
sleep 3

echo ""
echo "📍 STEP 4: Testing button state after database reset..."
if test_queue_status "AFTER RESET"; then
    button_active_after_reset=true
    echo -e "${GREEN}✅ After reset: Button is ACTIVE${NC}"
else
    button_active_after_reset=false
    echo -e "${RED}❌ After reset: Button is INACTIVE${NC}"
fi

echo ""
echo "📍 STEP 5: Testing queue number taking after reset..."
if test_take_queue_number "AFTER RESET"; then
    can_take_after=true
else
    can_take_after=false
fi

# Final analysis
echo ""
echo "🎯 FINAL ANALYSIS:"
echo "=================="
echo "Initial button state: $([ "$initial_button_active" = true ] && echo "ACTIVE" || echo "INACTIVE")"
echo "Button state after reset: $([ "$button_active_after_reset" = true ] && echo "ACTIVE" || echo "INACTIVE")"
echo "Can take number before reset: $([ "$can_take_before" = true ] && echo "YES" || echo "NO")"
echo "Can take number after reset: $([ "$can_take_after" = true ] && echo "YES" || echo "NO")"

if [ "$initial_button_active" = true ] && [ "$button_active_after_reset" = false ]; then
    echo ""
    echo -e "${RED}🚨 ISSUE CONFIRMED: Button becomes INACTIVE after database reset!${NC}"
    exit 1
elif [ "$button_active_after_reset" = true ]; then
    echo ""
    echo -e "${GREEN}✅ NO ISSUE: Button remains ACTIVE after database reset${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  UNCLEAR: Button was already inactive before reset${NC}"
    exit 1
fi