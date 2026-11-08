---
title: Rate Limits | Runware Docs
url: https://runware.ai/docs/models-api/rate-limits
description: Understanding platform rate limits and best practices for building resilient integrations with Runware.
relatedDocuments:
  - https://runware.ai/docs/models-api/authentication
  - https://runware.ai/docs/models-api/task-polling
---
## Introduction

Runware runs on **shared infrastructure with finite processing capacity**. Queue-based systems balance load across users while prioritizing active workloads, and the REST API adds a **per-organization rate limit** that sits far above typical traffic.

Under load, **latency rises first**. Once a model's queue is over capacity, new requests for that model are **rejected right away with a retry hint**.

**Current approach:**

- **High rate limit** - A per-organization limit on the REST API sits far above typical traffic.
- **Shared queues** - Requests are processed through model-specific queues with finite capacity.
- **Fair allocation** - Processing capacity is distributed fairly across active users.
- **Graceful degradation** - Under load, latency increases first. Once a queue is over capacity, new requests are rejected.

## What to expect

Under normal conditions, requests are processed quickly. **When platform capacity is reached**, here is what happens:

**1\. Queueing** - Requests enter a queue and wait for available processing capacity.

**2\. Increased latency** - Generation time increases as queue depth grows. This is normal and expected.

**3\. Overload rejection** - When a model's queue is over capacity, new requests for that model are rejected immediately with a retry hint. See [Overload rejections](#overload-rejections).

**4\. Long waits on sync requests** - A sync request over HTTP that is still running after 120 seconds returns its tasks as `processing`, and [task polling](https://runware.ai/docs/models-api/task-polling#long-running-sync-requests) retrieves the results.

**5\. Transient failures** - During peak demand, some requests may fail with retryable errors.

### HTTP status codes

You may encounter these status codes when capacity is constrained:

- **`429 Too Many Requests`** - The request was not accepted, because the model's queue is over capacity or your organization passed its rate limit. Retry after the wait in the `Retry-After` header.
- **`503 Service Unavailable`** - Temporary capacity constraint, retry recommended.
- **`504 Gateway Timeout`** - A task timed out, for example because a provider stopped responding.

All of these are transient and should be handled with retry logic.

### Overload rejections

When a model's queue is over capacity, the API rejects new requests for that model with the `serviceOverloaded` error code. The task is **rejected before it enters the queue**, so retrying it cannot run it twice.

**Error Response**:

```json
{
"errors": [
  {
    "code": "serviceOverloaded",
    "message": "The service is temporarily unavailable due to high demand. Please retry your request in a few moments.",
    "taskType": "imageInference",
    "retryAfter": 7,
    "taskUUID": "f4cdf306-e3dc-4a58-ad64-0ad049518e2d"
  }
]
}
```

`retryAfter` is the **number of seconds to wait** before sending the task again. It follows the load on the queue, so the value changes from one rejection to the next. In a request with several tasks, read it on each rejected task.

Over HTTP, a response made up only of these rejections is a `429` with a `Retry-After` header. WebSocket messages have no headers, so read the field there.

### Organization rate limit

The REST API also applies a **rate limit per organization**, counted in results per second. Each requested result counts once, so a task with `numberResults` set to 4 counts as four. The limit sits far above typical traffic.

A request over the limit fails with the `inferenceRateLimitExceeded` error code and a `429`. The `Retry-After` header gives the wait in seconds, and the request **was not processed**, so sending it again cannot run it twice.

A single request that asks for more results than the limit allows at once fails with `inferenceRateLimitRequestTooLarge`. Retrying it unchanged fails again, so **split it into smaller requests**.

## Third-party provider limits

We integrate with external AI providers like OpenAI, Black Forest Labs, ByteDance, and others. **Their rate limits and capacity constraints affect our service**, even when our infrastructure has available capacity.

> [!NOTE]
> Models from third-party providers are subject to the provider's own rate limits and capacity constraints. When a provider experiences high demand or enforces their limits, you may see reduced throughput or temporary unavailability for those specific models.

**What this means:**

- **Provider throttling appears as our errors** - You'll see 429, 503, or increased latency when upstream providers hit their limits.
- **We can't control their capacity** - Some providers enforce strict concurrency or rate limits that cascade to our service.
- **Model-specific constraints** - Check individual model documentation for provider-specific limitations.

This is an inherent part of working with third-party AI services, and why **a retry with backoff belongs in your client**.

## Best practices

### Implement retry logic

Retry capacity errors, and **wait for the time the API names** whenever the response carries one. Fall back to exponential backoff when it does not. A little random jitter on top keeps clients that were rejected together from all returning in the same second.

**TypeScript**:

```typescript
async function sendWithRetry(tasks: object[], maxRetries = 5) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RUNWARE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tasks),
    })

    const overCapacity = response.status === 429 || response.status === 503
    if (!overCapacity || attempt === maxRetries) {
      return response.json()
    }

    const hint = Number(response.headers.get('Retry-After'))
    const seconds = hint > 0 ? hint : 2 ** attempt
    await new Promise(resolve => setTimeout(resolve, (seconds + Math.random()) * 1000))
  }
}
```

**Python**:

```python
import random
import time
import httpx

def send_with_retry(tasks, max_retries=5):
    for attempt in range(max_retries + 1):
        response = httpx.post(
            'https://api.runware.ai/v1',
            headers={
                'Authorization': f'Bearer {RUNWARE_API_KEY}',
                'Content-Type': 'application/json',
            },
            json=tasks,
            timeout=None,
        )

        over_capacity = response.status_code in (429, 503)
        if not over_capacity or attempt == max_retries:
            return response.json()

        hint = response.headers.get('Retry-After', '')
        seconds = int(hint) if hint.isdigit() else 2 ** attempt
        time.sleep(seconds + random.random())
```

### Manage concurrency

While we don't enforce hard concurrency limits, we recommend the following for optimal performance:

**Standard usage** - 2-4 concurrent requests provides optimal throughput for most use cases.

**High-volume deployments** - Contact our team to discuss capacity planning and dedicated infrastructure options.

**Burst workloads** - Implement request throttling on your end to avoid saturating queues during sudden spikes.

> [!WARNING]
> Sending hundreds of concurrent requests may saturate queues and result in rejections or timeouts. Implement concurrency limits in your application for better reliability.

### Monitor response times

Track generation latency as a proxy for platform capacity:

- **Consistent sub-30s responses** - Healthy capacity, system operating normally.
- **Increasing latency trends** - Approaching capacity limits, consider reducing concurrency.
- **Frequent rejections or timeouts** - Queue saturation, implement backoff or reduce request volume.

Use latency monitoring to dynamically adjust your request patterns and avoid overwhelming the platform.

## Model-specific capacity

Some models have limited infrastructure due to hardware requirements, demand patterns, or provider constraints:

**High-demand models** - Popular models may experience longer queues during peak hours.

**Resource-intensive models** - Video generation and large models require significant GPU resources, limiting concurrent capacity. Check individual model documentation for specific constraints.

**Third-party provider models** - Models from external providers are subject to their capacity constraints and rate limits.

> [!NOTE]
> For production deployments requiring guaranteed capacity or SLAs on specific models, contact our sales team to discuss dedicated infrastructure options.

## What's coming

We're actively developing improvements to provide more predictable performance:

**Tiered concurrency limits** - Predictable limits based on usage tier, with clear thresholds and automatic scaling.

**Capacity reservations** - Guaranteed throughput for enterprise users with dedicated infrastructure.

**Real-time capacity metrics** - API endpoints showing current queue depth and estimated processing times.

**Serverless scaling** - Dynamic model loading for improved availability and reduced cold starts.

These improvements will provide enterprise-grade reliability while maintaining platform accessibility for all users.

## Summary

**Current state:**

- Shared infrastructure with finite capacity, and a high per-organization rate limit on the REST API
- Queueing under load, then rejection with a retry hint once a queue is over capacity
- Third-party provider limits affect service availability

**Your responsibilities:**

- Retry capacity errors, waiting for `Retry-After` when the response carries it
- Manage concurrency (2-4 concurrent requests recommended)
- Monitor latency and adjust request patterns

**Need guarantees?**

- Contact sales for dedicated capacity, SLAs, and custom infrastructure

Follow these and your integration **absorbs a capacity constraint instead of failing on it**.