'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Shield, CreditCard, RefreshCw } from 'lucide-react';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function ConfigPage() {
  const { accessToken } = useAdminAuthStore();
  const [config, setConfig] = useState({
    deliveryFee: 5.99,
    freeDeliveryThreshold: 50,
    taxRate: 6.0,
    serviceRadius: 25,
    minOrderAmount: 10,
    maxCodAmount: 100,
    forceCodForFirstNOrders: 3,
    driverAcceptTimeout: 30,
    maxDriverAttempts: 3,
    cancelFreeWindowMinutes: 5,
    cancelPenaltyPercent: 20,
  });

  const [paymentHealth, setPaymentHealth] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    adminApi.getPaymentHealth(accessToken).then((r) => setPaymentHealth(r.data)).catch(() => {});
    adminApi.getConfig(accessToken).then((r: any) => {
      const c = r.data;
      if (c) {
        setConfig({
          deliveryFee: c.deliveryFee?.base ?? 5.99,
          freeDeliveryThreshold: c.deliveryFee?.freeAbove ?? 50,
          taxRate: c.taxRate ?? 6.0,
          serviceRadius: c.serviceRadius?.default ?? 25,
          minOrderAmount: c.minimumOrderAmount ?? 10,
          maxCodAmount: c.payment?.cod?.maxOrderAmount ?? 100,
          forceCodForFirstNOrders: c.payment?.cod?.forceCodForFirstNOrders ?? 3,
          driverAcceptTimeout: c.driver?.acceptanceTimeoutSeconds ?? 30,
          maxDriverAttempts: c.driver?.maxConcurrentOrders ?? 3,
          cancelFreeWindowMinutes: 5,
          cancelPenaltyPercent: 20,
        });
      }
    }).catch(() => {});
  }, [accessToken]);

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    try {
      // Map flat UI config to nested AppConfig structure using dot notation for $set
      await adminApi.updateConfig(accessToken, {
        'deliveryFee.base': config.deliveryFee,
        'deliveryFee.freeAbove': config.freeDeliveryThreshold,
        taxRate: config.taxRate,
        'serviceRadius.default': config.serviceRadius,
        minimumOrderAmount: config.minOrderAmount,
        'payment.cod.maxOrderAmount': config.maxCodAmount,
        'payment.cod.forceCodForFirstNOrders': config.forceCodForFirstNOrders,
        'driver.acceptanceTimeoutSeconds': config.driverAcceptTimeout,
        'driver.maxConcurrentOrders': config.maxDriverAttempts,
      });
      toast.success('Configuration saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const sections = [
    {
      title: 'Pricing & Fees',
      fields: [
        { key: 'deliveryFee', label: 'Delivery Fee ($)', type: 'number', step: 0.01 },
        { key: 'freeDeliveryThreshold', label: 'Free Delivery Threshold ($)', type: 'number' },
        { key: 'taxRate', label: 'Tax Rate (%)', type: 'number', step: 0.1 },
        { key: 'minOrderAmount', label: 'Minimum Order ($)', type: 'number' },
        { key: 'maxCodAmount', label: 'Max COD Amount ($)', type: 'number' },
        { key: 'forceCodForFirstNOrders', label: 'Force COD for First N Orders', type: 'number' },
      ],
    },
    {
      title: 'Operations',
      fields: [
        { key: 'serviceRadius', label: 'Service Radius (miles)', type: 'number' },
        { key: 'driverAcceptTimeout', label: 'Driver Accept Timeout (sec)', type: 'number' },
        { key: 'maxDriverAttempts', label: 'Max Driver Assignment Attempts', type: 'number' },
      ],
    },
    {
      title: 'Cancellation Policy',
      fields: [
        { key: 'cancelFreeWindowMinutes', label: 'Free Cancel Window (min)', type: 'number' },
        { key: 'cancelPenaltyPercent', label: 'Cancel Penalty (%)', type: 'number' },
      ],
    },
  ];

  const circuitStateColor = (state: string) => {
    if (state === 'closed') return 'bg-success text-white';
    if (state === 'open') return 'bg-error text-white';
    return 'bg-warning text-white';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Configuration</h1>
          <p className="text-sm text-text-secondary mt-0.5">Global platform settings &amp; payment gateway status</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Payment Gateway Failover Status */}
      {paymentHealth && (
        <div className="bg-surface border border-border rounded-lg shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-text-primary">Payment Gateway Failover</h3>
          </div>

          {/* Failover Chain */}
          <div className="mb-4 p-3 rounded-lg bg-surface-secondary border border-border">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-secondary">Failover Chain</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${paymentHealth.autoFailover ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {paymentHealth.autoFailover ? 'Auto-Failover ON' : 'Auto-Failover OFF'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {paymentHealth.failoverChain?.map((gw: string, i: number) => (
                <span key={gw} className="flex items-center gap-2">
                  {i > 0 && <span className="text-text-tertiary">&rarr;</span>}
                  <span className="px-3 py-1 rounded-md bg-surface border border-border font-medium capitalize">
                    {gw}
                    {i === 0 && <span className="ml-1 text-[10px] text-brand">(primary)</span>}
                    {i === 1 && <span className="ml-1 text-[10px] text-text-tertiary">(fallback)</span>}
                    {i === 2 && <span className="ml-1 text-[10px] text-text-tertiary">(2nd fallback)</span>}
                  </span>
                </span>
              ))}
              <span className="text-text-tertiary">&rarr;</span>
              <span className="px-3 py-1 rounded-md bg-warning/10 border border-warning/20 text-warning text-xs font-medium">
                COD Offer
              </span>
            </div>
          </div>

          {/* Gateway Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentHealth.gateways?.map((gw: any) => (
              <div key={gw.gateway} className="p-4 rounded-lg border border-border bg-surface-secondary">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-text-primary capitalize">{gw.gateway}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${circuitStateColor(gw.circuitState)}`}>
                    {gw.circuitState.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-text-secondary">
                  <div className="flex justify-between">
                    <span>Configured</span>
                    <span className={gw.configured ? 'text-success' : 'text-error'}>{gw.configured ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Requests</span>
                    <span className="text-text-primary font-medium">{gw.totalRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failures</span>
                    <span className={gw.totalFailures > 0 ? 'text-error font-medium' : 'text-text-primary'}>{gw.totalFailures}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Failures</span>
                    <span>{gw.failures}/5 (circuit threshold)</span>
                  </div>
                  {gw.isPrimary && <div className="pt-1"><span className="text-[10px] px-1.5 py-0.5 bg-brand/10 text-brand rounded">PRIMARY</span></div>}
                  {gw.isFallback && <div className="pt-1"><span className="text-[10px] px-1.5 py-0.5 bg-warning/10 text-warning rounded">FALLBACK</span></div>}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-text-tertiary mt-3">
            Circuit breaker opens after 5 failures in 60s. Re-checks after 30s (half-open). Card declines do NOT trigger failover.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="bg-surface border border-border rounded-lg shadow-sm p-5">
            <h3 className="font-semibold text-text-primary mb-4">{section.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-text-secondary mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    step={(field as any).step}
                    value={(config as any)[field.key]}
                    onChange={(e) => setConfig({ ...config, [field.key]: parseFloat(e.target.value) || 0 })}
                    className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
