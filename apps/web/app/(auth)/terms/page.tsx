'use client';

import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Shield, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/login" className="p-2 rounded-full hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Terms & Conditions</h1>
            <p className="text-sm text-text-secondary">Last updated: April 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-text-secondary">

          {/* Introduction */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand" /> Introduction
            </h2>
            <p>
              Welcome to LoadNBehold ("Company", "we", "us", or "our"). These Terms & Conditions
              govern your use of our website, mobile application, and laundry pickup/delivery
              services (collectively, the "Services"). By accessing or using our Services, you agree
              to be bound by these Terms. If you do not agree, please do not use our Services.
            </p>
          </section>

          {/* Services */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">1. Our Services</h2>
            <p>
              LoadNBehold provides on-demand laundry pickup and delivery services in the Michigan area.
              Our services include Wash & Fold, Dry Cleaning, Ironing/Pressing, Stain Removal, and Bedding.
              Service availability may vary by location and is subject to change without notice.
            </p>
          </section>

          {/* Account */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">2. Account Registration</h2>
            <p className="mb-2">
              To use our Services, you must register an account by providing a valid US phone number.
              You are responsible for maintaining the confidentiality of your account credentials and
              for all activities that occur under your account.
            </p>
            <p>
              You must be at least 18 years old to create an account and use our Services.
            </p>
          </section>

          {/* Orders & Payments */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">3. Orders & Payments</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>All prices are listed in US Dollars (USD) and are subject to applicable taxes.</li>
              <li>Payment methods include online card payment (Stripe), wallet balance, and Cash on Delivery (COD) where eligible.</li>
              <li>Free delivery applies to orders exceeding $50 before tax.</li>
              <li>Cancellation within 5 minutes of placing is free; a fee may apply after.</li>
              <li>Tips for drivers are optional and go 100% to the assigned driver.</li>
            </ul>
          </section>

          {/* Liability */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">4. Limitation of Liability</h2>
            <p>
              While we take utmost care with your garments, LoadNBehold's liability for any lost
              or damaged items is limited to 10x the cleaning cost of the affected item(s). Claims
              must be filed within 48 hours of delivery. We are not liable for items left in pockets,
              pre-existing damage, or items not suitable for standard cleaning processes.
            </p>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">5. Privacy & Data</h2>
            <p>
              We collect and process your personal data in accordance with our Privacy Policy. By
              using our Services, you consent to the collection, use, and sharing of your information
              as described therein. We use your phone number for authentication (OTP), order updates,
              and promotional communications (which you can opt out of at any time).
            </p>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">6. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes become effective upon
              posting. Your continued use of the Services after changes constitutes acceptance of
              the updated Terms.
            </p>
          </section>

          {/* Contact Section */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand" /> Contact Us
            </h2>
            <p className="mb-4">
              If you have any questions about these Terms & Conditions, our Services, or need
              support, please reach out to us:
            </p>
            <div className="space-y-3">
              <a href="mailto:support@loadnbehold.com" className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-secondary transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center">
                  <Mail className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Email</p>
                  <p className="text-xs text-brand">support@loadnbehold.com</p>
                </div>
              </a>
              <a href="tel:+13135550100" className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-secondary transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center">
                  <Phone className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Phone</p>
                  <p className="text-xs text-brand">+1 (313) 555-0100</p>
                </div>
              </a>
            </div>
          </section>

        </div>

        {/* Footer */}
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
