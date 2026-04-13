'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Shield, CreditCard, RefreshCw, Wallet, Banknote, Gift, Bell, Zap, AlertTriangle } from 'lucide-react';
import { useAdminAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

export default function ConfigPage() {
  const { accessToken } = useAdminAuthStore();
  const [config, setConfig] = useState({
    deliveryFee: 5.99,
    deliveryFeePerMile: 0.5,
    freeDeliveryThreshold: 50,
    taxRate: 6.0,
    serviceRadius: 25,
    minOrderAmount: 10,
    maxCodAmount: 100,
    forceCodForFirstNOrders: 3,
    codSurcharge: 0,
    codDriverDepositDeadlineHours: 24,
    codMinCompletedOrders: 3,
    driverAcceptTimeout: 30,
    maxDriverAttempts: 3,
    cancelFreeWindowMinutes: 5,
    cancelPenaltyPercent: 20,
    walletEnabled: true,
    walletMaxBalance: 10000,
    walletTopUpAmounts: '10,25,50,100',
    referrerReward: 5,
    refereeDiscount: 10,
    maxReferralsPerUser: 20,
    notifOrderStatusSMS: true,
    notifPromotionalPush: true,
    notifDriverAlerts: true,
    notifAbandonedCartMinutes: 30,
    notifDormantCustomerDays: 14,
    expressEnabled: true,
    expressSurchargePercent: 50,
    maintenanceIsDown: false,
    maintenanceMessage: '',
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
          deliveryFeePerMile: c.deliveryFee?.perMile ?? 0.5,
          freeDeliveryThreshold: c.deliveryFee?.freeAbove ?? 50,
          taxRate: c.taxRate ?? 6.0,
          serviceRadius: c.serviceRadius?.default ?? 25,
          minOrderAmount: c.minimumOrderAmount ?? 10,
          maxCodAmount: c.payment?.cod?.maxOrderAmount ?? 100,
          forceCodForFirstNOrders: c.payment?.cod?.forceCodForFirstNOrders ?? 3,
          codSurcharge: c.payment?.cod?.surcharge ?? 0,
          codDriverDepositDeadlineHours: c.payment?.cod?.driverDepositDeadlineHours ?? 24,
          codMinCompletedOrders: c.payment?.cod?.minCompletedOrdersRequired ?? 3,
          driverAcceptTimeout: c.driver?.acceptanceTimeoutSeconds ?? 30,
          maxDriverAttempts: c.driver?.maxConcurrentOrders ?? 3,
          cancelFreeWindowMinutes: 5,
          cancelPenaltyPercent: 20,
          walletEnabled: c.payment?.wallet?.enabled ?? true,
          walletMaxBalance: c.payment?.wallet?.maxBalance ?? 10000,
          walletTopUpAmounts: (c.payment?.wallet?.topUpAmounts ?? [10, 25, 50, 100]).join(','),
          referrerReward: c.referral?.referrerReward ?? 5,
          refereeDiscount: c.referral?.refereeDiscount ?? 10,
          maxReferralsPerUser: c.referral?.maxReferralsPerUser ?? 20,
          notifOrderStatusSMS: c.notifications?.orderStatusSMS ?? true,
          notifPromotionalPush: c.notifications?.promotionalPush ?? true,
          notifDriverAlerts: c.notifications?.driverAlerts ?? true,
          notifAbandonedCartMinutes: c.notifications?.abandonedCartMinutes ?? 30,
          notifDormantCustomerDays: c.notifications?.dormantCustomerDays ?? 14,
          expressEnabled: c.expressService?.enabled ?? true,
          expressSurchargePercent: c.expressService?.surchargePercent ?? 50,
          maintenanceIsDown: c.maintenance?.isDown ?? false,
          maintenanceMessage: c.maintenance?.message ?? '',
        });
      }
    }).catch(() => {});
  }, [accessToken]);

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    try {
      const topUpAmounts = config.walletTopUpAmounts
        .split(',')
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      // Map flat UI config to nested AppConfig structure using dot notation for $set
      await adminApi.updateConfig(accessToken, {
        'deliveryFee.base': config.deliveryFee,
        'deliveryFee.perMile': config.deliveryFeePerMile,
        'deliveryFee.freeAbove': config.freeDeliveryThreshold,
        taxRate: config.taxRate,
        'serviceRadius.default': config.serviceRadius,
        minimumOrderAmount: config.minOrderAmount,
        'payment.cod.maxOrderAmount': config.maxCodAmount,
        'payment.cod.forceCodForFirstNOrders': config.forceCodForFirstNOrders,
        'payment.cod.surcharge': config.codSurcharge,
        'payment.cod.driverDepositDeadlineHours': config.codDriverDepositDeadlineHours,
        'payment.cod.minCompletedOrdersRequired': config.codMinCompletedOrders,
        'payment.wallet.enabled': config.walletEnabled,
        'payment.wallet.maxBalance': config.walletMaxBalance,
        'payment.wallet.topUpAmounts': topUpAmounts,
        'referral.referrerReward': config.referrerReward,
        'referral.refereeDiscount': config.refereeDiscount,
        'referral.maxReferralsPerUser': config.maxReferralsPerUser,
        'notifications.orderStatusSMS': config.notifOrderStatusSMS,
        'notifications.promotionalPush': config.notifPromotionalPush,
        'notifications.driverAlerts': config.notifDriverAlerts,
        'notifications.abandonedCartMinutes': config.notifAbandonedCartMinutes,
        'notifications.dormantCustomerDays': config.notifDormantCustomerDays,
        'expressService.enabled': config.expressEnabled,
        'expressService.surchargePercent': config.expressSurchargePercent,
        'maintenance.isDown': config.maintenanceIsDown,
        'maintenance.message': config.maintenanceMessage,
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

  function handleToggle(key: string) {
    setConfig((prev) => ({ ...prev, [key]: !(prev as any)[key] }));
  }

  const sections = [
    {
      title: 'Pricing & Fees',
      fields: [
        { key: 'deliveryFee', label: 'Delivery Fee Base ($)', type: 'number', step: 0.01 },
        { key: 'deliveryFeePerMile', label: 'Delivery Fee Per-Mile ($)', type: 'number', step: 0.01 },
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

        {/* COD Settings */}
        <div className="bg-surface border border-border rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-text-primary">COD Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Surcharge (%)</label>
              <input
                type="number"
                step={0.1}
                value={config.codSurcharge}
                onChange={(e) => setConfig({ ...config, codSurcharge: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Driver Deposit Deadline (hours)</label>
              <input
                type="number"
                value={config.codDriverDepositDeadlineHours}
                onChange={(e) => setConfig({ ...config, codDriverDepositDeadlineHours: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Min Completed Orders Required</label>
              <input
                type="number"
                value={config.codMinCompletedOrders}
                onChange={(e) => setConfig({ ...config, codMinCompletedOrders: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </div>
        </div>

        {/* Wallet Settings */}
        <div className="bg-surface border border-border rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-text-primary">Wallet Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between col-span-1">
              <label className="text-sm font-medium text-text-secondary">Wallet Enabled</label>
              <button
                type="button"
                onClick={() => handleToggle('walletEnabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.walletEnabled ? 'bg-brand' : 'bg-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.walletEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Max Balance ($)</label>
              <input
                type="number"
                value={config.walletMaxBalance}
                onChange={(e) => setConfig({ ...config, walletMaxBalance: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Top-Up Amounts (comma-separated)</label>
              <input
                type="text"
                value={config.walletTopUpAmounts}
                onChange={(e) => setConfig({ ...config, walletTopUpAmounts: e.target.value })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="10,25,50,100"
              />
            </div>
          </div>
        </div>

        {/* Referral Settings */}
        <div className="bg-surface border border-border rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-text-primary">Referral Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Referrer Reward ($)</label>
              <input
                type="number"
                step={0.01}
                value={config.referrerReward}
                onChange={(e) => setConfig({ ...config, referrerReward: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Referee Discount ($)</label>
              <input
                type="number"
                step={0.01}
                value={config.refereeDiscount}
                onChange={(e) => setConfig({ ...config, refereeDiscount: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Max Referrals Per User</label>
              <input
                type="number"
                value={config.maxReferralsPerUser}
                onChange={(e) => setConfig({ ...config, maxReferralsPerUser: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-surface border border-border rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-text-primary">Notification Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between col-span-1">
              <label className="text-sm font-medium text-text-secondary">Order Status SMS</label>
              <button
                type="button"
                onClick={() => handleToggle('notifOrderStatusSMS')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.notifOrderStatusSMS ? 'bg-brand' : 'bg-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.notifOrderStatusSMS ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between col-span-1">
              <label className="text-sm font-medium text-text-secondary">Promotional Push</label>
              <button
                type="button"
                onClick={() => handleToggle('notifPromotionalPush')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.notifPromotionalPush ? 'bg-brand' : 'bg-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.notifPromotionalPush ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between col-span-1">
              <label className="text-sm font-medium text-text-secondary">Driver Alerts</label>
              <button
                type="button"
                onClick={() => handleToggle('notifDriverAlerts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.notifDriverAlerts ? 'bg-brand' : 'bg-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.notifDriverAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Abandoned Cart Reminder (min)</label>
              <input
                type="number"
                value={config.notifAbandonedCartMinutes}
                onChange={(e) => setConfig({ ...config, notifAbandonedCartMinutes: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Dormant Customer Threshold (days)</label>
              <input
                type="number"
                value={config.notifDormantCustomerDays}
                onChange={(e) => setConfig({ ...config, notifDormantCustomerDays: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </div>
        </div>

        {/* Express Service */}
        <div className="bg-surface border border-border rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-text-primary">Express Service</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between col-span-1">
              <label className="text-sm font-medium text-text-secondary">Express Enabled</label>
              <button
                type="button"
                onClick={() => handleToggle('expressEnabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.expressEnabled ? 'bg-brand' : 'bg-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.expressEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Surcharge (%)</label>
              <input
                type="number"
                step={1}
                value={config.expressSurchargePercent}
                onChange={(e) => setConfig({ ...config, expressSurchargePercent: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="bg-surface border border-border rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-text-primary">Maintenance Mode</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between col-span-1">
              <label className="text-sm font-medium text-text-secondary">Maintenance Active</label>
              <button
                type="button"
                onClick={() => handleToggle('maintenanceIsDown')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.maintenanceIsDown ? 'bg-error' : 'bg-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.maintenanceIsDown ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Maintenance Message</label>
              <input
                type="text"
                value={config.maintenanceMessage}
                onChange={(e) => setConfig({ ...config, maintenanceMessage: e.target.value })}
                className="w-full h-10 px-3 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="We are currently undergoing scheduled maintenance..."
              />
            </div>
          </div>
          {config.maintenanceIsDown && (
            <div className="mt-3 p-3 rounded-lg bg-error/10 border border-error/20">
              <p className="text-sm text-error font-medium">Warning: Maintenance mode is active. The platform is currently unavailable to users.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
