---
title: Pricing | Runware Docs
url: https://runware.ai/docs/models-api/pricing
description: How Runware charges for a generation, where the price of each model lives, and how to read pricing data as JSON.
relatedDocuments:
  - https://runware.ai/docs/models-api/account-management
  - https://runware.ai/docs/models-api/model-search
---
## Introduction

You pay for what each request uses, in USD, with **no subscription and no minimum spend**. Your balance is deducted as you generate and it never expires.

Two things decide what a generation costs: **the model you call** and **what you ask it for**. A 10 second video costs more than a 5 second one, and a 2048 × 2048 image costs more than a 512 × 512 one.

## How a model is priced

**Most models charge a rate per unit.** The unit is whatever the model produces or consumes, from a second of video to a million tokens. Multiply the units you asked for by the rate and you know the price before you send the request.

**Some models are billed by compute time.** The charge follows the GPU time your request uses, so every setting that gives it more work to do makes it cost more. These models publish measured runs instead of a rate: real generations, each with the settings that produced it and what it was charged.

Compute time also works in your favor. **When an optimization cuts the GPU time a model needs, the cost of a generation drops with it**, with no change on your side and no new price to adopt.

## What changes the cost

**Anything that gives the model more work to do costs more.** These are the usual ones, and they are examples rather than the whole list.

| Factor | Effect |
| --- | --- |
| **Model** | Sets the rate, or the hardware and optimizations the run uses. |
| **Resolution** | More pixels take longer to generate, and some models price each tier separately. |
| **Duration** | Video and audio are usually charged per second of output. |
| **Steps** | Each step is another pass through the model. |
| **Number of outputs** | `numberResults` multiplies the cost of the task. |

A model can charge for other things too, such as each reference image past the first few, or the characters of a script it has to read. **The rate card on the model's page names every unit that model bills by.**

## Where the price of a model lives

A model with a published price carries a **Cost and speed** panel on its page, with the rates, the measured runs, and example generations with their price and the time they took. When a model is running a temporary offer, a badge shows it there, and **what you are charged while the offer lasts is lower than the listed rate**.

Start at the [Models](https://runware.ai/docs/models) section. **A model with a rate tells you what a request costs before you send it.** One billed by compute time tells you after it runs, and its measured runs are there to size it up first.

## Pricing data as JSON

The same data is published as JSON, so an agent or a script can read prices without scraping a page.

| Endpoint | What it holds |
| --- | --- |
| `/docs/models/index.json` | Every public model with its id, AIR, capabilities, and the URL of its schema. |
| `/docs/models/<model>/schema.json` | The OpenAPI document for one model. Pricing is in `info["x-pricing"]`. |
| `/docs/models/<model>/examples.json` | The runs behind the example prices, each with its request and response. |

Ask any model for its pricing block and you get **the shape that fits how it charges**. The example lists are shortened here.

**Per second**:

```bash
curl -s https://runware.ai/docs/models/alibaba-wan3-0/schema.json | jq '.info["x-pricing"]'
```

```json
{
  "currency": "USD",
  "docs": "https://runware.ai/docs/models-api/pricing",
  "rates": [
    { "amount": 0.05, "unit": "durationSecond", "label": "480p", "display": "$0.05 per second" },
    { "amount": 0.1, "unit": "durationSecond", "label": "720p", "display": "$0.10 per second" },
    { "amount": 0.2, "unit": "durationSecond", "label": "1080p", "display": "$0.20 per second" }
  ],
  "examples": [
    {
      "id": "mycelium-packaging-factory-b-roll",
      "configuration": "first-frame · 720p · 5s",
      "price": 0.504,
      "latencyMs": 127753
    }
  ]
}
```

**Per run**:

```bash
curl -s https://runware.ai/docs/models/prunaai-p-image-ideogram/schema.json | jq '.info["x-pricing"]'
```

```json
{
  "currency": "USD",
  "docs": "https://runware.ai/docs/models-api/pricing",
  "rates": [
    { "amount": 0.003, "unit": "output", "label": "1K - very low thinking", "display": "$0.003 per image" },
    { "amount": 0.006, "unit": "output", "label": "2K - very low thinking", "display": "$0.006 per image" }
  ],
  "examples": [
    {
      "id": "stage-backdrop-conservation-book-cover",
      "configuration": "text-to-image",
      "price": 0.0225,
      "latencyMs": 16427
    }
  ]
}
```

**Per token**:

```bash
curl -s https://runware.ai/docs/models/minimax-m3/schema.json | jq '.info["x-pricing"]'
```

```json
{
  "currency": "USD",
  "docs": "https://runware.ai/docs/models-api/pricing",
  "basis": "token",
  "rates": [
    { "amount": 3e-07, "unit": "inputToken", "label": "≤ 512K context", "display": "$0.30 per 1M input tokens" },
    { "amount": 6e-07, "unit": "inputToken", "label": "> 512K context", "display": "$0.60 per 1M input tokens" },
    { "amount": 1.2e-06, "unit": "outputToken", "label": "≤ 512K context", "display": "$1.20 per 1M output tokens" },
    { "amount": 2.4e-06, "unit": "outputToken", "label": "> 512K context", "display": "$2.40 per 1M output tokens" },
    { "amount": 6e-08, "unit": "cachedInputToken", "label": "≤ 512K context", "display": "$0.06 per 1M cached tokens" },
    { "amount": 1.2e-07, "unit": "cachedInputToken", "label": "> 512K context", "display": "$0.12 per 1M cached tokens" }
  ],
  "examples": [
    {
      "id": "forced-utc-time-function-call",
      "configuration": "tool-calling",
      "price": 0.000136,
      "latencyMs": 1230
    }
  ]
}
```

**Compute time**:

```bash
curl -s https://runware.ai/docs/models/alibaba-z-image/schema.json | jq '.info["x-pricing"]'
```

```json
{
  "currency": "USD",
  "docs": "https://runware.ai/docs/models-api/pricing",
  "measured": [
    { "configuration": "512×512 · steps 20", "price": 0.0013, "latencyMs": 6175 },
    { "configuration": "1024×1024 · steps 20", "price": 0.0045, "latencyMs": 16846 },
    { "configuration": "1024×1024 · steps 50", "price": 0.0102, "latencyMs": 20374 }
  ],
  "examples": [
    {
      "id": "chicken-embryo-cutaway-workbook-illustration",
      "configuration": "inpaint · 896×1152",
      "price": 0.0045,
      "latencyMs": 19568
    }
  ]
}
```

A model billed by compute time has no `rates`. It carries `measured` instead, with the price of each configuration we ran. **Most of both kinds carry `examples`** as well, the runs behind those numbers.

### Reading a rate

`amount` and `unit` are the price a program should calculate with. `display` is the same value written out for a person to read.

**Token rates are stored per token and displayed per million.** An `amount` of `0.00001` on `inputToken` is `$10.00 per 1M input tokens`, which is what `display` says.

`label` names the configuration the rate applies to, such as `720p` or `≤ 272K context`. **`after` means the rate only starts applying beyond that many units**, like the sixth reference image onwards.

| Unit | One unit is |
| --- | --- |
| `output` | One generation, whatever it produced. |
| `durationSecond` | One second of the video or audio returned. |
| `computeSecond` | One second of GPU time. |
| `gigabyteSecond` | One gigabyte of memory held for one second. |
| `step` | One inference step. |
| `inputImage` | One image handed to the model. |
| `inputMegapixel`, `outputMegapixel` | One megapixel in, or one megapixel out. |
| `character`, `utf8Byte` | One character, or one byte, of the input text. |
| `inputToken`, `outputToken` | One token read, or one token produced. |
| `cachedInputToken`, `cacheWriteToken` | One input token served from the cache, or written into it. |

**A `basis` field appears when the rates are not exactly what a request costs.** `token` means the bill follows how much the model produced, `passthrough` means the provider prices each job and the rates are typical, `floor` means a request that produces more than the rates cover is billed per token, and `plusTokens` means the prompt and any text answered with are billed on top.

### What the example prices are

Examples are **real generations we ran and paid for**, with at least one for every mode the model supports. They are picked to cover the features of the model, from plain text to image up to editing with references, and each one carries the settings that produced it, its price and how long it took.

**They are not averages, and they are not a sample of what other customers do.** For a request that matches none of them, take the rate and multiply, or run it once and read the cost it returns.

> [!NOTE]
> `examples.json` carries the full request body of each example next to its price. Sending that body back to the API runs the same request, so you can check the cost of a workflow before wiring it into your product.

## The cost of a request you send

Add `includeCost` to any task and the response carries a `cost` field with the USD amount deducted for it.

**TypeScript**:

```typescript
import { createClient } from '@runware/sdk'

const client = await createClient({ apiKey: process.env.RUNWARE_API_KEY })
await client.connect()

const [result] = await client.run({
  model: 'runware:z-image@0',
  positivePrompt: 'a red apple on a wooden table',
  width: 1024,
  height: 1024,
  includeCost: true
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
            "model": "runware:z-image@0",
            "positivePrompt": "a red apple on a wooden table",
            "width": 1024,
            "height": 1024,
            "includeCost": True
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
      "taskType": "imageInference",
      "taskUUID": "39d7207a-343e-4198-9c40-ef6d302cadb3",
      "model": "runware:z-image@0",
      "positivePrompt": "a red apple on a wooden table",
      "width": 1024,
      "height": 1024,
      "includeCost": true
    }
  ]'
```

**CLI**:

```bash
runware run runware:z-image@0 \
  positivePrompt="a red apple on a wooden table" \
  width=1024 \
  height=1024 \
  includeCost=true
```

**JSON**:

```json
{
  "taskType": "imageInference",
  "taskUUID": "39d7207a-343e-4198-9c40-ef6d302cadb3",
  "model": "runware:z-image@0",
  "positivePrompt": "a red apple on a wooden table",
  "width": 1024,
  "height": 1024,
  "includeCost": true
}
```

**Failed generations are not charged.** You only pay for tasks that returned a result.

## Balance and payments

All amounts are in USD. The [Dashboard](https://runware.ai/dashboard) is where you top up, turn on **auto-reload** so your balance refills when it falls below a threshold, set low balance alerts, and add a backup payment method.

For high volume work, [talk to sales](https://runware.ai/contact) about custom pricing.