# BullMQ Job Queue System

Complete background job processing system for LoadNBehold using BullMQ and Redis.

## Architecture

```
jobs/
├── queue.ts                      # Queue factory and configuration
├── index.ts                      # Job system initialization
├── cron.ts                       # Cron job scheduling
└── workers/
    ├── notification.worker.ts    # Notification processing
    ├── order.worker.ts          # Order-related jobs
    └── maintenance.worker.ts    # System maintenance tasks
```

## Available Queues

- **notifications** - Push notifications, SMS, email
- **payments** - Payment processing
- **driver-assignment** - Driver matching and assignment
- **reports** - Report generation
- **maintenance** - System cleanup and maintenance
- **order-processing** - Order lifecycle management

## Usage Examples

### 1. Sending a Push Notification

```typescript
import { queues } from '../jobs';

// Queue a push notification
await queues.notifications.add('send-push', {
  userId: '507f1f77bcf86cd799439011',
  title: 'Order Update',
  body: 'Your order is on the way!',
  data: { orderId: 'ORD-12345', status: 'out_for_delivery' }
});
```

### 2. Assigning a Driver to an Order

```typescript
import { queues } from '../jobs';

// Queue driver assignment
await queues.orderProcessing.add('assign-driver', {
  orderId: order._id.toString(),
  outletId: order.outletId.toString(),
  pickupLongitude: order.pickupAddress.location.coordinates[0],
  pickupLatitude: order.pickupAddress.location.coordinates[1],
  attempt: 1
});
```

### 3. Scheduling Order Auto-Cancel

```typescript
import { queues } from '../jobs';

// Schedule auto-cancel after 30 minutes if payment is not completed
await queues.orderProcessing.add(
  'auto-cancel',
  { orderId: order._id.toString() },
  { delay: 30 * 60 * 1000 } // 30 minutes
);
```

### 4. Send Order Status Notification

```typescript
import { queues } from '../jobs';

await queues.notifications.add('send-order-status', {
  userId: order.customerId.toString(),
  orderNumber: order.orderNumber,
  status: 'picked_up',
  statusLabel: 'Picked Up'
});
```

## Job Types

### Notification Worker

- `send-push` - Send push notification via FCM
- `send-sms` - Send SMS via Twilio
- `send-email` - Send email
- `send-order-status` - Send order status update notification

### Order Worker

- `assign-driver` - Find and assign nearest available driver
- `expire-unaccepted` - Reassign if driver doesn't accept within 30s
- `auto-cancel` - Cancel unpaid orders after 30 minutes

### Maintenance Worker

- `cleanup-expired-otps` - Remove expired OTP keys from Redis
- `expire-offers` - Deactivate expired promotional offers
- `check-driver-docs` - Check for expired driver documents
- `daily-report` - Generate daily system reports

## Cron Jobs

Automatically scheduled tasks:

- **Every 5 minutes**: Cleanup expired OTPs
- **Daily at 2 AM**: Generate daily reports
- **Daily at 3 AM**: Expire old offers
- **Daily at 6 AM**: Check driver documents

## Integration in Routes

Example: Order creation with background jobs

```typescript
import { queues } from '../../jobs';

// In order.controller.ts
export async function createOrder(req: Request, res: Response) {
  const order = await Order.create(orderData);
  
  // Queue driver assignment
  await queues.orderProcessing.add('assign-driver', {
    orderId: order._id.toString(),
    outletId: order.outletId.toString(),
    pickupLongitude: order.pickupAddress.location.coordinates[0],
    pickupLatitude: order.pickupAddress.location.coordinates[1]
  });
  
  // Queue auto-cancel if not paid within 30 minutes
  if (order.paymentMethod === 'online' && order.payment.status === 'pending') {
    await queues.orderProcessing.add(
      'auto-cancel',
      { orderId: order._id.toString() },
      { delay: 30 * 60 * 1000 }
    );
  }
  
  res.json({ success: true, data: order });
}
```

## Monitoring

### View Queue Status

```typescript
import { queues } from './jobs';

// Get queue metrics
const counts = await queues.notifications.getJobCounts();
console.log(counts); // { active, waiting, completed, failed, delayed }

// Get failed jobs
const failedJobs = await queues.notifications.getFailed();
```

### Retry Failed Jobs

```typescript
// Retry a specific failed job
const job = await queues.notifications.getJob(jobId);
if (job) {
  await job.retry();
}

// Retry all failed jobs
const failedJobs = await queues.notifications.getFailed();
for (const job of failedJobs) {
  await job.retry();
}
```

## Configuration

### Queue Options

Default configuration in `queue.ts`:

- **Attempts**: 3 retries on failure
- **Backoff**: Exponential backoff (2s base delay)
- **Retention**: Keep 100 completed jobs for 24 hours
- **Failed Jobs**: Keep 500 failed jobs for 7 days

### Worker Options

- **Concurrency**:
  - Notifications: 10 concurrent jobs
  - Orders: 5 concurrent jobs
  - Maintenance: 2 concurrent jobs

## Error Handling

All job failures are logged with full context:

```typescript
logger.error(
  { err: error, jobId: job.id, jobName: job.name, queue: queueName },
  'Job failed'
);
```

Failed jobs are automatically retried up to 3 times with exponential backoff.

## Graceful Shutdown

The job system handles graceful shutdown on SIGTERM/SIGINT:

```typescript
// Automatically handled in src/index.ts
process.on('SIGTERM', async () => {
  await shutdownJobSystem();
  server.close();
});
```

## Redis Connection

BullMQ uses separate Redis connections (not the shared ioredis instance):

```typescript
// Configured in queue.ts
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});
```

## Best Practices

1. **Always use queues for**:
   - External API calls (Twilio, FCM, payment gateways)
   - Long-running operations
   - Tasks that can fail and need retry logic
   - Scheduled/delayed tasks

2. **Don't use queues for**:
   - Simple database operations
   - Synchronous validations
   - Real-time user responses

3. **Job naming**: Use descriptive names with hyphens (e.g., `send-push`, `assign-driver`)

4. **Job data**: Keep job payloads small and serializable (primitives and plain objects only)

5. **Idempotency**: Design jobs to be safely retried (check state before processing)

## Development

### Testing Jobs Locally

```typescript
// Trigger a job manually for testing
import { queues } from '../jobs';

await queues.maintenance.add('cleanup-expired-otps', { pattern: 'otp:*' });
```

### Clear All Jobs

```typescript
// Clear all jobs in a queue (useful for development)
await queues.notifications.obliterate({ force: true });
```

### List Cron Jobs

```typescript
import { listCronJobs } from './jobs/cron';

await listCronJobs();
```

## Troubleshooting

### Jobs Not Processing

1. Check Redis connection: `redis-cli ping`
2. Verify workers are running: Check logs for "Worker for 'queue-name' started"
3. Check queue status: `await queues.queueName.getJobCounts()`

### Memory Issues

- Adjust retention settings in `queue.ts`
- Clear old completed jobs: `await queue.clean(24 * 3600, 1000, 'completed')`

### Failed Jobs Accumulating

- Review error logs
- Fix underlying issues
- Retry or remove failed jobs
