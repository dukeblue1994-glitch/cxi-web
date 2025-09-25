# 🧪 Function Testing Examples

## Test Schedule Nudge Function

```bash
curl -X POST http://localhost:8888/.netlify/functions/schedule-nudge \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "token": "test-token-123"
  }'
```

## Test Nudge Cron Function

```bash
curl http://localhost:8888/.netlify/functions/nudge-cron
```

## Using VS Code REST Client

Create a file `test-requests.http`:

```http
### Test Schedule Nudge
POST http://localhost:8888/.netlify/functions/schedule-nudge
Content-Type: application/json

{
  "email": "test@example.com",
  "token": "test-token-123"
}

### Test Nudge Cron
GET http://localhost:8888/.netlify/functions/nudge-cron
```

## Function URLs:

- Schedule Nudge: http://localhost:8888/.netlify/functions/schedule-nudge
- Nudge Cron: http://localhost:8888/.netlify/functions/nudge-cron
