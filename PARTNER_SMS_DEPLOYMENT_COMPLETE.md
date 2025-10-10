# Partner SMS Agent - Deployment Instructions

## ✅ What's Been Completed

All code is written and ready:

### Files Created
1. `supabase/migrations/031_partner_sms_conversations.sql` - Database table ✅
2. `lib/partner-sms/intent-parser.ts` - Pattern matching + Claude fallback ✅
3. `lib/partner-sms/action-executor.ts` - Database updates ✅
4. `lib/partner-sms/response-templates.ts` - SMS message templates ✅
5. `lib/partner-sms/conversation-state.ts` - State management ✅
6. `lib/partner-sms/notifications.ts` - Agent-initiated triggers ✅
7. `app/api/webhooks/partner-sms/route.ts` - Twilio webhook endpoint ✅

### Configuration Complete
- ✅ Database migration run
- ✅ Twilio webhook configured: `https://www.tidyhood.nyc/api/webhooks/partner-sms`
- ✅ Messaging service set up

## 🚀 Deploy to Production

### Step 1: Commit New Files

```bash
git add supabase/migrations/031_partner_sms_conversations.sql
git add lib/partner-sms/
git add app/api/webhooks/partner-sms/
git add PARTNER_SMS_*.md
git commit -m "Add partner SMS agent system"
```

### Step 2: Push to Repository

```bash
git push origin main
```

### Step 3: Verify Deployment

1. Go to your Vercel Dashboard
2. Wait for deployment to complete (~1-2 minutes)
3. Check deployment logs for any errors

### Step 4: Set Environment Variable

In Vercel Dashboard → Settings → Environment Variables, add:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then **redeploy** for the env var to take effect.

### Step 5: Test the SMS Agent

Send a test SMS to your Twilio number:
- Text: "hello" or "help"
- Expected: Agent responds with help text

## 📊 Monitoring

### Check Twilio Logs
Monitor → Logs → Messaging
- Look for HTTP 200 responses (success)
- Check for any errors

### Check Vercel Logs
Your Project → Logs → Functions
- Look for `/api/webhooks/partner-sms` requests
- Check for any errors in the agent logic

## 🔧 Troubleshooting

### Issue: Still getting 405 error
**Solution**: Files not deployed yet - check Vercel deployment status

### Issue: Getting 500 errors
**Solution**: Check Vercel logs for the specific error. Most likely:
- Missing `ANTHROPIC_API_KEY` environment variable
- Database connection issue (check `NEXT_PUBLIC_SUPABASE_URL`)

### Issue: Agent not responding
**Solution**: Check:
1. Vercel logs - is webhook being called?
2. Twilio logs - what's the HTTP response?
3. Database - is conversation being created?

## 📋 Integration Checklist

Once the SMS agent is working, integrate notification triggers:

- [ ] Add `notifyPartnerNewOrder()` when admin assigns partner
- [ ] Add `notifyPartnerReadyForDelivery()` when quote approved
- [ ] Add `notifyPartnerOrderComplete()` when delivery complete

See `PARTNER_SMS_INTEGRATION_GUIDE.md` for details.

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ Text "hello" → Get help message back
2. ✅ Twilio logs show HTTP 200
3. ✅ Vercel logs show successful processing
4. ✅ Database shows new conversation record
5. ✅ Agent remembers context across multiple messages

## Next Steps

1. Deploy the code (Steps 1-4 above)
2. Test with SMS
3. Add integration triggers in your API routes
4. Test full workflow end-to-end

The SMS agent is **production-ready** once deployed!
