---
title: Connection & Authentication | Runware Docs
url: https://runware.ai/docs/models-api/authentication
description: Learn how to connect and authenticate with the Runware API using HTTP REST or WebSockets.
relatedDocuments:
  - https://runware.ai/docs/models-api/introduction
  - https://runware.ai/docs/models-api/rate-limits
---
## Introduction

Every request to the Runware API authenticates with **an API key unique to your account**. You can create a separate key per project or environment, describe it, and **revoke it at any time**. With the teams feature you can also share a key with your team.

Sign up on [Runware](https://runware.ai/signup) and open the **API Keys** page, then click Create Key and fill in the details.

## HTTP (REST)

We recommend using [WebSockets](#websockets) for a more efficient and faster connection. However, if you prefer to use a **simpler connection** and don't need to keep it open, you can use HTTP REST API.

The URL for the API is **`https://api.runware.ai/v1`**. All requests must be made using the `POST` method and the `Content-Type` header must be set to `application/json`.

The payload for each request is a **JSON array with one or more objects**. Each object represents a task to be executed by the API.

There are two ways in: **the authentication object as the first element of the array**, or the `Authorization` header with `Bearer <API_KEY>`.

**Payload Auth**:

```bash
curl --location 'https://api.runware.ai/v1' \
     --header 'Content-Type: application/json' \
     --data-raw '[
       {
         "taskType": "authentication",
         "apiKey": "<API_KEY>"
       },
       {
         "taskType": "imageInference",
         "taskUUID": "39d7207a-87ef-4c93-8082-1431f9c1dc97",
         "positivePrompt": "a cat",
         "width": 512,
         "height": 512,
         "model": "civitai:102438@133677",
         "numberResults": 1
       }
     ]'
```

**Header Auth**:

```bash
curl --location 'https://api.runware.ai/v1' \
     --header 'Content-Type: application/json' \
     --header 'Authorization: Bearer <API_KEY>' \
     --data-raw '[
       {
         "taskType": "imageInference",
         "taskUUID": "39d7207a-87ef-4c93-8082-1431f9c1dc97",
         "positivePrompt": "a cat",
         "width": 512,
         "height": 512,
         "model": "civitai:102438@133677",
         "numberResults": 1
       }
     ]'
```

The API returns a JSON object with a `data` array holding every response object. **Each one carries the `taskType` and the `taskUUID` of the request it answers**, alongside whatever else the task produced.

```json
{
  "data": [
    {
      "taskType": "imageInference",
      "taskUUID": "39d7207a-87ef-4c93-8082-1431f9c1dc97",
      "imageUUID": "b7db282d-2943-4f12-992f-77df3ad3ec71",
      "imageURL": "https://im.runware.ai/image/os/a14d18/ws/2/ii/b7db282d-2943-4f12-992f-77df3ad3ec71.jpg"
    }
  ]
}
```

**On an error there is no `data` property at all.** The response carries `error` instead, with the message.

## WebSockets

We support WebSocket connections as they are **more efficient, faster, and less resource intensive**. We have made our WebSocket connections easy to work with, as each response contains the request ID. So it's possible to easily match **request → response**.

The API uses a bidirectional protocol that encodes all messages as **JSON objects**.

You can connect through **one of the SDKs** ([TypeScript](https://runware.ai/docs/tools/typescript), [Python](https://runware.ai/docs/tools/python)) or by hand.

If you prefer to connect manually (to use another language/technology), the endpoint URL is **`wss://ws-api.runware.ai/v1`**.

### New connections

#### Request

WebSocket connections are point-to-point, so **there's no need for each request to contain an authentication header**.

Instead, the first request **must always** be an authentication request that includes the API key. This way we can identify which subsequent requests are arriving from the same user.

**TypeScript**:

```typescript
import { createClient } from '@runware/sdk'

const client = await createClient({ apiKey: process.env.RUNWARE_API_KEY })
await client.connect()

const [result] = await client.run({
  taskType: 'authentication',
  apiKey: '<API_KEY>'
})
```

**Python**:

```python
import asyncio
import os

from runware import Runware

async def main():
    async with Runware(api_key=os.environ["RUNWARE_API_KEY"]) as client:
        results = await client.run({
            "taskType": "authentication",
            "apiKey": "<API_KEY>"
        })

asyncio.run(main())
```

**cURL**:

```bash
curl https://api.runware.ai/v1 \
  -H "Authorization: Bearer $RUNWARE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "taskType": "authentication",
      "apiKey": "<API_KEY>"
    }
  ]'
```

**CLI**:

```bash
runware run undefined apiKey="<API_KEY>"
```

**JSON**:

```json
{
  "taskType": "authentication",
  "apiKey": "<API_KEY>"
}
```

#### Response

The authentication request returns a `connectionSessionUUID`. It is unique to your connection and **is what resumes it after a drop** (more on this later).

```json
{
  "data": [
    {
      "taskType": "authentication",
      "connectionSessionUUID": "f40c2aeb-f8a7-4af7-a1ab-7594c9bf778f"
    }
  ]
}
```

In case of error you will receive an object with the error message.

```json
{
  "errors": [
    {
      "code": "invalidApiKey",
      "message": "Invalid API key. Get one at https://runware.ai/signup",
      "parameter": "apiKey",
      "type": "string",
      "taskType": "authentication"
    }
  ]
}
```

### Keeping connection alive

The WebSocket connection is kept open for 120 seconds **from the last message exchanged**. If you **don't send any messages for 120 seconds**, the connection will be closed automatically.

To keep the connection going, you can send a `ping` message when needed, to which we will reply with a `pong`.

#### Request

Send a ping task to signal that the connection is still active:

**TypeScript**:

```typescript
import { createClient } from '@runware/sdk'

const client = await createClient({ apiKey: process.env.RUNWARE_API_KEY })
await client.connect()

const [result] = await client.run({
  taskType: 'ping',
  ping: true
})
```

**Python**:

```python
import asyncio
import os

from runware import Runware

async def main():
    async with Runware(api_key=os.environ["RUNWARE_API_KEY"]) as client:
        results = await client.run({
            "taskType": "ping",
            "ping": True
        })

asyncio.run(main())
```

**cURL**:

```bash
curl https://api.runware.ai/v1 \
  -H "Authorization: Bearer $RUNWARE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "taskType": "ping",
      "ping": true
    }
  ]'
```

**CLI**:

```bash
runware run undefined ping=true
```

**JSON**:

```json
{
  "taskType": "ping",
  "ping": true
}
```

#### Response

The server will respond confirming the connection is alive:

```json
{
  "data": [
    {
      "taskType": "ping",
      "pong": true
    }
  ]
}
```

### Resuming connections

If any service, server or network is unresponsive (for instance due to a restart), all the results that could not be delivered **are kept in a buffer memory for 120 seconds**. You can reconnect and have these messages delivered by including the `connectionSessionUUID` parameter in the initial authentication connection request.

```json
[
  {
    "taskType": "authentication",
    "apiKey": "<API_KEY>",
    "connectionSessionUUID": "f40c2aeb-f8a7-4af7-a1ab-7594c9bf778f"
  }
]
```

This means there is no need to make the same request again, the initial one will be delivered when reconnecting.

SDK libraries reconnect **automatically**.