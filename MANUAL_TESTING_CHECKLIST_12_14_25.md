# Manual Testing Checklist
**Date**: December 14, 2025
**URL**: http://localhost:5174/terminal
**Status**: Ready for Testing

---

## 🎯 Phase 2: Frontend UI Testing (Manual)

### Test 2.1: Terminal Page Load ⏳
**Instructions**:
1. Page should be open in your browser
2. Check browser console (F12) for errors

**Checklist**:
- [ ] Page loads without errors
- [ ] No red errors in browser console
- [ ] Sidebar visible on left with "YoRHa Terminal" header
- [ ] Chat area visible in center
- [ ] Input textarea at bottom
- [ ] Send button visible
- [ ] Quick action buttons visible

**Status**: ⏳ TESTING

---

### Test 2.2: Chat Message Send ⏳
**Instructions**:
1. Click in the input textarea
2. Type: "Summarize the key legal issues when CPS removes a child from the home."
3. Click Send button (or press Enter)
4. Wait for response (may take 3-5 seconds)

**Checklist**:
- [ ] User message appears in chat (right side, green background)
- [ ] Loading indicator shows ("Analyzing case data...")
- [ ] Assistant response appears (left side, gray background)
- [ ] Response contains meaningful text about CPS/child removal
- [ ] Timestamp shows for both messages
- [ ] No console errors

**Status**: ⏳ TESTING

---

### Test 2.3: Keyword Chips Display ⏳
**Instructions**:
1. After response appears, look below the assistant message
2. You should see green keyword chips with # prefix

**Checklist**:
- [ ] 3+ keyword chips visible (e.g., #CPS, #removal, #child)
- [ ] Chips are green colored with rounded borders
- [ ] Chips have # prefix
- [ ] Chips are clickable (cursor changes to pointer on hover)

**Status**: ⏳ TESTING

---

### Test 2.4: Keyword Chip Click ⏳
**Instructions**:
1. Click on a keyword chip (e.g., #CPS)
2. Verify input field populates
3. Click Send button
4. Verify new response appears

**Checklist**:
- [ ] Input field populates with "Show me more evidence about: [keyword]"
- [ ] Can edit the populated text
- [ ] New message can be sent
- [ ] New response appears
- [ ] No console errors

**Status**: ⏳ TESTING

---

### Test 2.5: Suggestion Button Click ⏳
**Instructions**:
1. Look for suggestion buttons below keywords (green bordered buttons)
2. Click on a suggestion button
3. Verify input field populates
4. Click Send button
5. Verify new response appears

**Checklist**:
- [ ] 3+ suggestion buttons visible
- [ ] Buttons have green borders
- [ ] Input field populates with suggestion text
- [ ] Can edit the populated text
- [ ] New message can be sent
- [ ] New response appears
- [ ] No console errors

**Status**: ⏳ TESTING

---

### Test 2.6: Empty Message Handling ⏳
**Instructions**:
1. Clear the input field (delete all text)
2. Try to click Send button
3. Verify nothing happens
4. Type only spaces
5. Try to click Send button
6. Verify nothing happens

**Checklist**:
- [ ] Send button is disabled when input is empty
- [ ] No request sent when empty
- [ ] No error message shown
- [ ] Send button is disabled when input is only spaces
- [ ] No request sent when only spaces

**Status**: ⏳ TESTING

---

### Test 2.7: Keyboard Shortcuts ⏳
**Instructions**:
1. Type a message in the input field
2. Press Shift+Enter
3. Verify newline is added to message
4. Press Enter (without Shift)
5. Verify message is sent

**Checklist**:
- [ ] Shift+Enter adds newline to message
- [ ] Message stays in input field after Shift+Enter
- [ ] Enter (without Shift) sends message
- [ ] Message appears in chat after Enter
- [ ] Input field is cleared after sending

**Status**: ⏳ TESTING

---

### Test 2.8: Multiple Messages ⏳
**Instructions**:
1. Send 3-5 messages in sequence
2. Wait for each response
3. Verify all messages appear in chat
4. Verify chat scrolls properly

**Test Messages**:
- "What are the main legal issues in child custody cases?"
- "Explain parental rights in CPS cases"
- "What evidence is needed for custody hearings?"

**Checklist**:
- [ ] All user messages visible in chat
- [ ] All assistant responses visible in chat
- [ ] Chat scrolls smoothly to show latest messages
- [ ] No duplicate messages
- [ ] Timestamps are sequential
- [ ] No console errors

**Status**: ⏳ TESTING

---

### Test 2.9: YoRHa Detective Page ⏳
**Instructions**:
1. Open new tab: http://localhost:5174/yorha-detective
2. Wait for boot sequence (about 5 seconds)
3. Verify boot screen displays
4. Verify Detective Interface loads after boot

**Checklist**:
- [ ] Boot screen displays with black background
- [ ] YoRHa logo visible with green glow
- [ ] Progress bar animates from 0% to 100%
- [ ] Boot messages appear sequentially:
  - "Initializing YoRHa OS..."
  - "Loading Neural Network Protocols..."
  - "Establishing Connection to Command Center..."
  - "Activating Detective Support System..."
  - "AI Assistant 9S Online..."
  - "Investigation Interface Ready."
- [ ] After boot sequence, Detective Interface loads
- [ ] No console errors
- [ ] Fade transition works smoothly

**Status**: ⏳ TESTING

---

## 📊 Test Results Summary

### Phase 2 Results
| Test | Status | Notes |
|------|--------|-------|
| 2.1 Page Load | ⏳ Testing | |
| 2.2 Message Send | ⏳ Testing | |
| 2.3 Keywords Display | ⏳ Testing | |
| 2.4 Keyword Click | ⏳ Testing | |
| 2.5 Suggestion Click | ⏳ Testing | |
| 2.6 Empty Message | ⏳ Testing | |
| 2.7 Keyboard Shortcuts | ⏳ Testing | |
| 2.8 Multiple Messages | ⏳ Testing | |
| 2.9 Detective Page | ⏳ Testing | |

---

## 🐛 Issues Found

### Issue 1: [If any]
**Test**: [Test number]
**Description**: [What went wrong]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Severity**: [Critical/High/Medium/Low]
**Status**: [Open/Fixed]

---

## ✅ Success Criteria

### Must Pass (All Required)
- [ ] Page loads without errors
- [ ] Messages can be sent
- [ ] Responses appear
- [ ] Keywords display
- [ ] Suggestions display
- [ ] No console errors

### Should Pass (Important)
- [ ] Keyword chips clickable
- [ ] Suggestion buttons work
- [ ] Keyboard shortcuts work
- [ ] Multiple messages work
- [ ] Chat scrolls properly

### Nice to Have (Optional)
- [ ] YoRHa Detective page works
- [ ] Animations smooth
- [ ] UI responsive

---

## 📝 Notes

**Testing Started**: [Time]
**Testing Completed**: [Time]
**Total Duration**: [Duration]
**Tester**: [Your name]

**Overall Result**: ⏳ IN PROGRESS

---

## 🚀 Next Steps After Manual Testing

1. Document all test results above
2. Note any issues found
3. Proceed to Phase 3: Data Persistence Testing
4. Run automated database queries to verify data
5. Create final test report

---

**Instructions**:
- Check each box as you complete the test
- Note any issues in the "Issues Found" section
- Update test status (⏳ → ✅ PASS or ❌ FAIL)
- Take screenshots if issues found

