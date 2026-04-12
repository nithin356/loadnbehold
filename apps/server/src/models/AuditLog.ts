import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actor: { userId: mongoose.Types.ObjectId; role: string; ip: string };
  action: string;
  resource: { type: string; id: string };
  changes?: { before: Record<string, unknown>; after: Record<string, unknown> };
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  actor: {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    ip: { type: String, required: true },
  },
  action: { type: String, required: true },
  resource: {
    type: { type: String, required: true },
    id: { type: String, required: true },
  },
  changes: {
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ 'actor.userId': 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
