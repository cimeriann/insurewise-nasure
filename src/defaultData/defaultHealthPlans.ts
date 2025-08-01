// defaultSavingsPlans.ts

export const defaultSavingsPlans = [
  {
    name: 'Essential Health Saver',
    tier: 'basic',
    coverage: {
      hospitalization: true,
      outpatient: true,
      dental: false,
      optical: false,
      maternity: false,
      preExistingConditions: false,
    },
    premium: {
      monthly: 90,
      quarterly: 260,
      yearly: 1000,
    },
    maxCoverageAmount: 15000,
    waitingPeriod: 45,
    description:
      'Affordable essential coverage focusing on hospitalization and outpatient care for individuals with minimal health risks.',
    isActive: true,
  },
  {
    name: 'Comprehensive Family Plan',
    tier: 'standard',
    coverage: {
      hospitalization: true,
      outpatient: true,
      dental: true,
      optical: true,
      maternity: true,
      preExistingConditions: false,
    },
    premium: {
      monthly: 240,
      quarterly: 700,
      yearly: 2600,
    },
    maxCoverageAmount: 50000,
    waitingPeriod: 30,
    description:
      'Balanced family plan providing extensive care including maternity, dental, and optical services. Designed for families seeking wider coverage.',
    isActive: true,
  },
  {
    name: 'Executive Elite Care',
    tier: 'premium',
    coverage: {
      hospitalization: true,
      outpatient: true,
      dental: true,
      optical: true,
      maternity: true,
      preExistingConditions: true,
    },
    premium: {
      monthly: 450,
      quarterly: 1300,
      yearly: 5000,
    },
    maxCoverageAmount: 100000,
    waitingPeriod: 15,
    description:
      'Top-tier plan for executives and professionals requiring comprehensive coverage, including pre-existing conditions and minimal waiting periods.',
    isActive: true,
  },
  {
    name: 'Senior Wellness Plan',
    tier: 'standard',
    coverage: {
      hospitalization: true,
      outpatient: true,
      dental: true,
      optical: false,
      maternity: false,
      preExistingConditions: true,
    },
    premium: {
      monthly: 220,
      quarterly: 650,
      yearly: 2400,
    },
    maxCoverageAmount: 40000,
    waitingPeriod: 20,
    description:
      'Plan tailored for seniors with coverage of pre-existing conditions, hospitalization, and dental care, focusing on wellness and preventive care.',
    isActive: true,
  },
  {
    name: 'Young Adult Starter',
    tier: 'basic',
    coverage: {
      hospitalization: true,
      outpatient: true,
      dental: false,
      optical: true,
      maternity: false,
      preExistingConditions: false,
    },
    premium: {
      monthly: 110,
      quarterly: 320,
      yearly: 1200,
    },
    maxCoverageAmount: 20000,
    waitingPeriod: 60,
    description:
      'Ideal for young adults entering the workforce; includes optical coverage and essential health services with low premiums.',
    isActive: true,
  },
  {
    name: 'Maternity Plus Plan',
    tier: 'premium',
    coverage: {
      hospitalization: true,
      outpatient: true,
      dental: true,
      optical: true,
      maternity: true,
      preExistingConditions: false,
    },
    premium: {
      monthly: 400,
      quarterly: 1150,
      yearly: 4400,
    },
    maxCoverageAmount: 80000,
    waitingPeriod: 10,
    description:
      'Specialized plan focused on maternity care with extended coverage for new mothers including dental and optical services.',
    isActive: true,
  },
  {
    name: 'Chronic Care Advantage',
    tier: 'premium',
    coverage: {
      hospitalization: true,
      outpatient: true,
      dental: true,
      optical: true,
      maternity: false,
      preExistingConditions: true,
    },
    premium: {
      monthly: 480,
      quarterly: 1400,
      yearly: 5400,
    },
    maxCoverageAmount: 120000,
    waitingPeriod: 5,
    description:
      'Designed for individuals with chronic conditions requiring ongoing care, offering comprehensive coverage with minimal waiting periods.',
    isActive: true,
  },
  {
    name: 'Dental & Optical Focus Plan',
    tier: 'standard',
    coverage: {
      hospitalization: false,
      outpatient: false,
      dental: true,
      optical: true,
      maternity: false,
      preExistingConditions: false,
    },
    premium: {
      monthly: 70,
      quarterly: 200,
      yearly: 750,
    },
    maxCoverageAmount: 10000,
    waitingPeriod: 30,
    description:
      'Affordable plan focusing exclusively on dental and optical care, perfect as a supplement to existing health coverage.',
    isActive: true,
  },
];
 