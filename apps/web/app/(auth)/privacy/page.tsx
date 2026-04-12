'use client';

import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/login" className="p-2 rounded-full hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Privacy Policy</h1>
            <p className="text-sm text-text-secondary">Last updated: April 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">Information We Collect</h2>
            <p>We collect information you provide directly: phone number, name, email, delivery addresses, and payment information. We also collect usage data including order history, app interactions, and device information to improve our Services.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Process and deliver your laundry orders</li>
              <li>Communicate order updates via SMS and push notifications</li>
              <li>Process payments and prevent fraud</li>
              <li>Improve our Services and customer experience</li>
              <li>Send promotional offers (with your consent; opt-out available)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">Data Sharing</h2>
            <p>We share your information only with: delivery drivers (name and address for fulfillment), payment processors (Stripe, Square, PayPal), and service providers who assist our operations. We never sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">Data Security</h2>
            <p>We implement industry-standard security measures including encrypted data transmission (TLS), secure token-based authentication, and encrypted payment processing. However, no method of transmission over the Internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">Your Rights</h2>
            <p>You have the right to access, update, or delete your personal information at any time through your account settings or by contacting our support team.</p>
          </section>

          {/* Contact */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand" /> Questions?
            </h2>
            <div className="space-y-3">
              <a href="mailto:privacy@loadnbehold.com" className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-secondary transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center">
                  <Mail className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Privacy Inquiries</p>
                  <p className="text-xs text-brand">privacy@loadnbehold.com</p>
                </div>
              </a>
              <a href="tel:+13135550100" className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-secondary transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center">
                  <Phone className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Support Line</p>
                  <p className="text-xs text-brand">+1 (313) 555-0100</p>
                </div>
              </a>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-center text-xs text-text-tertiary">
          <p>&copy; {new Date().getFullYear()} LoadNBehold Inc. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/terms" className="text-brand hover:underline">Terms</Link>
            <Link href="/privacy" className="text-brand hover:underline">Privacy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
