import React from 'react';

// Define custom navy colors (add these to your tailwind.config.js if not already present)
const navyColors = {
  900: 'bg-[#0f172a]',    // Very deep navy (almost black)
  800: 'bg-[#1e293b]',
  700: 'bg-[#334155]',
  600: 'bg-[#475569]',
  500: 'bg-[#64748b]',
  400: 'bg-[#94a3b8]',
  300: 'bg-[#cbd5e1]',
  200: 'bg-[#e2e8f0]',
  100: 'bg-[#f1f5f9]',
};

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0f172a] border-t border-[#1e293b]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand & Copyright */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Druk Park
            </h3>
            <p className="mt-3 text-sm text-slate-300">
              © {currentYear} Druk Park. All rights reserved.
            </p>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Smart Parking Management System for the Royal Government of Bhutan
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-5">
              Legal & Support
            </h4>
            <nav className="flex flex-col space-y-4">
              <a
                href="/privacy-policy"
                className="text-sm text-slate-300 hover:text-white transition-colors duration-200"
                aria-label="Privacy Policy"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="text-sm text-slate-300 hover:text-white transition-colors duration-200"
                aria-label="Terms of Service"
              >
                Terms of Service
              </a>
              <a
                href="/contact"
                className="text-sm text-slate-300 hover:text-white transition-colors duration-200"
                aria-label="Contact Us"
              >
                Contact Us
              </a>
            </nav>
          </div>

          {/* Version & Attribution */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right">
            <p className="text-sm font-medium text-slate-200">
              Version 1.0.0
            </p>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed max-w-xs">
              Enterprise-grade intelligent parking monitoring and enforcement platform
            </p>
            <p className="mt-6 text-sm text-slate-400 font-medium">
              Proudly developed for the Royal Government of Bhutan
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#1e293b]" />

        {/* Bottom Credit */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            © {currentYear} Druk Park — Official Parking Management Solution of Bhutan
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;