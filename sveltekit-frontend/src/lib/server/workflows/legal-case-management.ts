// XState v5 Legal Case Management Workflow State Machine
import { createMachine, assign, sendTo, raise, fromPromise, fromCallback } from 'xstate';
import { db, cases, evidence, personsOfInterest, caseAnalysis } from '$lib/server/db/client';
import { cache } from '$lib/server/cache/redis';

// Types for legal case management workflow
export interface LegalCaseContext {
  caseId: string;
  title: string;
  description: string;
  jurisdiction: string;
  caseType: 'civil' | 'criminal' | 'administrative' | 'regulatory';
  status: 'draft' | 'active' | 'under_review' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedLawyers: string[];
  createdBy: string;
  evidenceItems: string[];
  personsOfInterest: string[];
  timeline: Array<{
    date: string;
    event: string;
    description: string;
    category: string;
  }>;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    risks: string[];
    recommendations: string[];
    confidenceLevel: number;
  };
  documents: string[];
  deadlines: Array<{
    date: string;
    description: string;
    type: 'filing' | 'hearing' | 'discovery' | 'settlement' | 'trial';
    completed: boolean;
  }>;
  budget: {
    allocated: number;
    spent: number;
    remaining: number;
  };
  progress: number;
  errors: string[];
  lastModified: number;
  notifications: string[];
  workflowStage: 'intake' | 'investigation' | 'preparation' | 'proceedings' | 'resolution' | 'closure';
}

export type LegalCaseEvent =
  | { type: 'CREATE_CASE'; title: string; description: string; caseType: string; jurisdiction: string; createdBy: string }
  | { type: 'ADD_EVIDENCE'; evidenceId: string; description: string; type: string; source: string }
  | { type: 'ADD_PERSON_OF_INTEREST'; personId: string; name: string; role: string; relationship: string }
  | { type: 'ADD_TIMELINE_EVENT'; date: string; event: string; description: string; category: string }
  | { type: 'UPDATE_ANALYSIS'; analysis: any }
  | { type: 'SET_DEADLINE'; date: string; description: string; type: string }
  | { type: 'ASSIGN_LAWYER'; lawyerId: string; name: string }
  | { type: 'UPDATE_STATUS'; status: string }
  | { type: 'UPDATE_PRIORITY'; priority: string }
  | { type: 'COMPLETE_DEADLINE'; deadlineId: string }
  | { type: 'GENERATE_REPORT' }
  | { type: 'ARCHIVE_CASE' }
  | { type: 'ESCALATE' }
  | { type: 'NOTIFY_STAKEHOLDERS'; message: string; recipients: string[] }
  | { type: 'CALCULATE_RISKS' }
  | { type: 'PROGRESS_UPDATE'; progress: number }
  | { type: 'VALIDATION_COMPLETE' }
  | { type: 'VALIDATION_FAILED'; errors: string[] };

// Case management actors
const caseValidationActor = fromPromise(async ({ input }: { 
  input: { 
    title: string; 
    description: string; 
    caseType: string; 
    jurisdiction: string 
  } 
}) => {
  const { title, description, caseType, jurisdiction } = input;
  console.log(`🔍 Validating case: ${title}`);
  
  const errors: string[] = [];
  
  if (!title || title.trim().length < 5) {
    errors.push('Case title must be at least 5 characters long');
  }
  
  if (!description || description.trim().length < 20) {
    errors.push('Case description must be at least 20 characters long');
  }
  
  if (!['civil', 'criminal', 'administrative', 'regulatory'].includes(caseType)) {
    errors.push('Invalid case type specified');
  }
  
  if (!jurisdiction || jurisdiction.trim().length === 0) {
    errors.push('Jurisdiction is required');
  }
  
  // Check for duplicate cases (simplified)
  const duplicateCheck = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const existingCases = await cache.get(`cases:search:${duplicateCheck}`);
  if (existingCases && Array.isArray(existingCases) && existingCases.length > 0) {
    errors.push('A case with a similar title may already exist');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
  
  console.log(`✅ Case validation complete: ${title}`);
  return { valid: true };
});

const caseCreationActor = fromPromise(async ({ input }: { 
  input: { 
    title: string; 
    description: string; 
    caseType: string; 
    jurisdiction: string; 
    createdBy: string 
  } 
}) => {
  const { title, description, caseType, jurisdiction, createdBy } = input;
  console.log(`📝 Creating case in database: ${title}`);
  
  const caseData = {
    title,
    description,
    caseType,
    jurisdiction,
    status: 'draft' as const,
    priority: 'medium' as const,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      workflowStage: 'intake',
      progress: 10,
      timeline: [],
      analysis: {
        strengths: [],
        weaknesses: [],
        risks: [],
        recommendations: [],
        confidenceLevel: 0
      }
    }
  };
  
  const [newCase] = await db.insert(cases).values(caseData).returning();
  console.log(`✅ Case created with ID: ${newCase.id}`);
  
  // Cache the case for quick access
  await cache.set(`case:${newCase.id}`, newCase, 3600); // 1 hour TTL
  
  return { caseId: newCase.id, case: newCase };
});

const riskAnalysisActor = fromPromise(async ({ input }: { input: { caseId: string; context: any } }) => {
  const { caseId, context } = input;
  console.log(`⚖️ Performing risk analysis for case: ${caseId}`);
  
  // Simulate AI-powered risk analysis
  const risks: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  
  // Analyze based on case type
  switch (context.caseType) {
    case 'criminal':
      risks.push('Statute of limitations concerns', 'Evidence chain of custody');
      strengths.push('Clear jurisdiction', 'Documented evidence');
      weaknesses.push('Limited witness availability');
      recommendations.push('Secure witness testimonies', 'Validate evidence integrity');
      break;
      
    case 'civil':
      risks.push('Financial liability exposure', 'Settlement pressure');
      strengths.push('Well-documented timeline', 'Clear damages assessment');
      weaknesses.push('Opposing party resources');
      recommendations.push('Consider mediation options', 'Prepare financial projections');
      break;
      
    case 'administrative':
      risks.push('Regulatory changes', 'Compliance deadlines');
      strengths.push('Regulatory framework clarity');
      weaknesses.push('Administrative process complexity');
      recommendations.push('Monitor regulatory updates', 'Establish compliance checkpoints');
      break;
      
    case 'regulatory':
      risks.push('Policy interpretation disputes', 'Enforcement variability');
      strengths.push('Industry precedents');
      weaknesses.push('Evolving regulations');
      recommendations.push('Review recent interpretations', 'Engage regulatory experts');
      break;
  }
  
  // Calculate confidence level based on available data
  let confidenceLevel = 50; // Base confidence
  
  if (context.evidenceItems.length > 0) confidenceLevel += 15;
  if (context.personsOfInterest.length > 0) confidenceLevel += 10;
  if (context.timeline.length > 2) confidenceLevel += 15;
  if (context.assignedLawyers.length > 0) confidenceLevel += 10;
  
  confidenceLevel = Math.min(confidenceLevel, 95); // Cap at 95%
  
  const analysis = {
    strengths,
    weaknesses,
    risks,
    recommendations,
    confidenceLevel,
    analysisDate: new Date().toISOString(),
    lastUpdated: Date.now()
  };
  
  console.log(`✅ Risk analysis complete with ${confidenceLevel}% confidence`);
  return { analysis };
});

const stakeholderNotificationActor = fromPromise(async ({ input }: { 
  input: { 
    caseId: string; 
    message: string; 
    recipients: string[]; 
    notificationType: string 
  } 
}) => {
  const { caseId, message, recipients, notificationType } = input;
  console.log(`📢 Sending notifications for case: ${caseId} to ${recipients.length} recipients`);
  
  // Simulate notification sending
  const notifications = recipients.map(recipient => ({
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    recipient,
    message,
    type: notificationType,
    sentAt: new Date().toISOString(),
    status: 'sent'
  }));
  
  // Store notifications
  await cache.set(`notifications:case:${caseId}`, notifications, 86400); // 24h TTL
  
  console.log(`✅ Notifications sent successfully`);
  return { notifications };
});

// Progress tracking for legal cases
const legalProgressTracker = fromCallback(({ sendBack, receive }) => {
  let progress = 10; // Start with initial progress
  
  receive((event) => {
    switch (event.type) {
      case 'CASE_CREATED':
        progress = 20;
        break;
      case 'EVIDENCE_ADDED':
        progress = Math.min(progress + 10, 70);
        break;
      case 'POI_ADDED':
        progress = Math.min(progress + 5, 70);
        break;
      case 'TIMELINE_UPDATED':
        progress = Math.min(progress + 5, 75);
        break;
      case 'ANALYSIS_COMPLETE':
        progress = Math.min(progress + 15, 85);
        break;
      case 'LAWYERS_ASSIGNED':
        progress = Math.min(progress + 10, 90);
        break;
      case 'CASE_ACTIVE':
        progress = Math.min(progress + 5, 95);
        break;
      case 'CASE_COMPLETED':
        progress = 100;
        break;
    }
    
    sendBack({ type: 'PROGRESS_UPDATE', progress });
  });
});

// Main legal case management state machine
export const legalCaseManagementMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlwGIB5AFQBUBJAEQCEBlRgNTYG0AFAB1VgC6w+JYhxAAPRAFoATAA4ALA1EA2OgCYAzEarqFAGhCsQmqgGZNAVgAcmjXW1UAvp-NosuAlQkFNQ03HyCIuJSSipKGs4a6iEaWs72SFoKmhqa2lQs-u5eASBBoeEUGITklHS0DEwc3Lz8giJiElK5eaZK5kYK2iq2tsp0mqqe3n4BwaEARCEAJnMzFNFxiclpmYLZ+UVSyVKl5RpVOAq+tna22k5IpjguNhreWs5an6+BwaQhE3NEzAmwIJFKFWqXzSCCqxVU6hcVAMGgsVjolCJJQAnj5-IFgmEIlFVtENHQqNjdE4HK53NiArJQoNfEhBmAoghkOEOFMqDAANYAUQAkmQ6KFvgCgcCKaCyNDYQjvC44SiUVZMdkjEK1LqNPq9K4zHQKjYnAqNg5Kq5tO4NM0sW1HqNeoMaEJfmJgkJWRyBYChWFYhsRFtdvtxXLScoGpD-mqHq5PWq6ppXN0KnRdH7tOq2vpKhc3N4CIEEJheACYcjUZz0fCMVEq95a+L5eT6S3m01NObdDo9DbUOqKycdJ0Sk4zYPPQ1vfHfeLAzHgmRKJaxxKJzz41G7ixp7OqOEezQNKm0xpc5cXrcbC0Pf6VT6a0FdbHfaGKb0KYhimN6JrePa9gex7jpQo6BM2L6VmKx42hOxIajYcHPrqOqevqXDULWFQftmJoakqaiuCWg4GGo8FmN+M7rlgQ7FuawZNrObaNFgY6BnQCGGEhHgOPY6ygdcBjmOutr6BcFGjLWlQrIR8EkXC5FQBh8E9kBkKOCBIDfEgKAaKxhFQapOGMSUu7oZUeI4jijqQp4mg6oEcQnHQdB0LQKnqYJQlliJ9YAIo4BAtCwMAtAYApymqepml0MAygQCVZU6UhrAAHL+YFbZBZZqK2F2LlImWJEWIYWqBfUpQlMEaFuK45TBHKCinGU5QGqURhmOUCWvmlCKVLBj7VlgrJmNQ2h0OliXKcNqkAEIqYFs2xYFwX8lOREuF4yVvK4aotY6RhGQcZjlOF+hMdcNZXO0vUQP5WKIjNc3IEgp0Oelh0rcdKW3VJJTxM6T2aN9Njao4zjah5JWblcxgKm9p0fbdS1rQgG0qQBSF7cdC7HY9zP8Sx9geR4nifZcmj+Kx+b-aYXzPVc1qKucgOQ4JfnVHQdDLrQqP3Y9UMOFjK0lPY3ynKdGiQ2tOO49J7EbEgaxrMj4uo-YNrWJoKqM+Y6gHHQuMPSTr2Q9TdO04g6mabLVN0zTdOoBzWlfLzeO87zNzM3aOMOPK4slK9Ug2kTvMy9gKAAOKKMpmn6apBnG5p21yxJ0NM1jYTfQzjOMNKZhmOrjOE4cUXfWFCuQ5tz1q0t5uk3tFOJdTO0SRTLG0+x-28-z-gXHz0uQ+LQeuxAy3BdJl7q7zxPnE4pQQxoMWlFcUduPYTuOy9CWGxALsYJpBv53nm2E8Xq1l5TTv83KdZfN9o5aqQEElrLvCrJgddFjvDZiCZKgJkpjGNJzN02oT7nyjjrFOacpR3TTlfYUMUvQ6gAvoMEJgdB2mfLyBmxQtgNUyq1du6s1T93VpXDOLdHrKmcFFOgb9K7YMOKuQ4Bc6BcI4Tw9mZNFjHC3C0ZmeRbT3HYfddhmgTiywIjIjOYcQEaJ7gnb8ZZmyJ0fK1E4KhTCXFwf7E4lpbTX0XEFNwaVtTm28ZJfxrZAzQlEWTUefCLZJyTnmJwhhQpHD5CxWKn9f7aKdHKLYWoBHaLZG-TROgLSKNbN0exJNhGahHJcYJvNjFD1OPTcJmgsrHy8YYqJPjYlJ3ickzaSS2G4NXJY9cJRQnrjCSlSKpiHDXGCEElpbTHHtNIQzLpkYeluOaZtEpZSKk3yqcUxcZwEpHDYZUqK3dJzBFfqpCo3h+RbOWT5GOjtzZbI2bLWpnTGF5NeYEyWzyqleI8dLLpPj4rZLJLkopJhYqjWyvYHUdB3kRPBc0-5Nw7nqhCE4k4DdwRBBCOFZmcLIVcuhdnWFvzh4BKxbLROdoZ7YrnmYOetLHAksnjUG4VwOYGGsOqbwKoHZ5RzpzA+fzZbYvuTTNMCUWUKwCv4lOL84o7hShYM43MFaogdPyfYCr4E5tVT49VQS7lMoSWvK4qU8r5QMJgykZjLSxRoXc8eQyQSQpeVIyepbPaKu1QQXVD9PkqpCDnI1Jqb4pQ9Ey31Xq-VmDaT6bpIazAzD+qnEOJqTa1t9gKKTaq9tQaI06u9Xqg+sbmQdHJBzDSUa-nxrOfG3RiaE2grZuafQNozgDwfncdh2ayZzG2Hkemm4e0mCTrm2cBbe0lvHUWy2FaSZVrLQ8txVomT8g0HDfYWwbTbGMQ0OYKpiAMqPG3GqSSb2NrveU5mVSLZdKhYkMJMtJzlIAIzCkzBR6IgaIAuKdKJlPqfU2nOL6xOWDmFc+gIqVQoLmFC4qhokHGsK3E4e6z4qs2LfHW9TJVPvUl+kJJQ3CfGCnccKgQIps0NCYw9xhrVPv9S+q9xV8nVJ8tVJgPy-xUkCtWIjY7QM+yLlOmV9w6RNXpJy4k3LKNgZgwagGkaM5wJVT7W1Kq7VqoHhq2j0bXVce40GV+I5rAyg7V6n1fqA0QaE-B1Z4iLBCzOEYCwlQUHhCJj4Jw0YSU8Y40HMlFb42ELpSx5kKH7kGCJF6IKBIIpggrU57N1MJwS2lEYBjxgWZVNs6YJw5QLLNcadmXPJd81G7TtHQOXD3b8cK-MrTHvpIl6zBKEm9pS6zY9XL7RMDjgytKUUQgsziB5kIfNyS8e3jySdFoQjnBOKyI3eSr7mvK-ZlBaX6sFea+YNr6wj06lM8N0bOm+b5H7E4O+fWuafm8KqOZfCQKjVBSNJgrbtW9f1+Dk8NHj0tIyJtK8LB8xivmqKcz-NrCXl6eCCrVYxZdQtmbHqivsz+kFMKo2CqTcnb+JKjhpvbuPfqRUhKyRkgdh9vJrbpsAa7a7NbXRsrcwVKnHQgJzH5UFLyNBQJX0NHrT9hdwqgdrZizG7lkqKoqgpJYUwGS8gbGyq9hxj2Vu5YZI7aXcRYqyC2Pca4lpEduGQ0YhTR5-V5G-gDqPKnJj1xWzTGTAVgfRZyjFBjjsYfBGqLqbvjKHg45nTZAaI4k3lhSOTh7MmhOUKw7GkJdDM4pGZSJdcqkONLPVTyWOC-TJJzFIf5VtDsaE-ZF8TrzEYBNnfrJOL5VGHtyj8wvHKUJ9bI9TBOZzAGl2OegLgEyBxMC8M7gDlJALwfgjQWXuzSHWVuxcAAAJz6xGKg+i-0K0+x9EwzZF7VnAqmKi7T5G5AvCghoAOEMKLJhEOO7M+L7M4Y42nQ2NjW4FyS0U0f6Z+DYfUNUFyVfVUJwayLA2xazf6FrJxW3fLQTTdUpPdH9ArdmWqFhYJOuSTJ9fYG0NbE4CfI+LbHKa4NIJ+T6BUQIwdEaXgzKbQCJOhJuDmAjLhBXOqe3VwMqFYcKCcAKcKIIj3TnInLjfQhUKOJwnHQHD5Y2KdSGUnCKXbLbCAuwRaC6dRAIj3PZYKMZDma4FKWgkIqDdqHGY4f7BUOe5lQ5Kna5eqYaJmBYNGIdQeE7Q3Hja5fbe5R5Z5Kef5VwAFRfIFZfcwlQ+8W3EwsKJJYI67e-OjZjHlF2M1HLNmfySzJmXuO+P6KwbqJwKrFjTqdA-Zb7bWQHPLcvKqGzeqEFG4OqKKZwLKcZUpCgxNAYYoLaduJFGdYIgGNKYzIrGOcrMYiqSqU5HkEYs8O4nKBFSqNoS4m8Z6I-Dg71FhNlAJJqVEqXBqPKGcBERKO4xpZKQInE4I3qAaTXfnIJRwYJZHVbeAuxPYiY2jKYmOHqGON+OkGjVzPuZmBVWOKqQKfUdZVKFzC5eeNGGzOebOe0vE4w2gsjBQaOIwVbNKHPDOXEgzU4sUyjPkJiQ-D2KudQhgw2Zzew0xSzFhOY7IkIIzGOYhSqUY7jXvfmOKKjYJK9RE8I3dJhFhFhN+dhFrMef7OqOE8hVlJKfY+UyIn1VE7zHaRYjqDaaBCLGzWzYhTnN4nkqYmqYPYIlKWzfGMZMpfzZhYxKpDE+7ZaIKDaeuQ4q4rODjJhFhXpFo54+LPGPKCKPEqqJeT6GU3qJzHjG9Ok+Ex0po0kykipSk6klcwrOkwTRk4I5kx-S0vbN4iJRrWvGzYZGZbsReFedwNhD4PnGZWdUYzjGrScLkzqLKUeK4qrTNe5KfRrBuOYMqT9Xovbbko5Aqe6BqTmeqLQTGNU5wXaKwf7UqVzYaU04CKOCwU7Aa7k3-aQwTUYLOWEhxJUlKFhfbLvG-FhHkqDMqfGBeLwT7NabrFGHQ46A8YdEaJU3Zc9TEscxtQEjkq4FUmTdUpzEhGZOcPafbFjWOI8qY4TGTHvYdTYLqTjFKR4q+VwZaVhFmJyF+S8kqYKCKPKJzGWXuQEwJR+RwOYh1e4iErNJFHjO7JYVqe+UE7-HIxhNUnWUKJZRFJJCEztFJfJcE2YvqKqfzcqXrKqHnO5UKJOYIhYjjUaTnOc+8i7JcywvaXjaIwtcpDGLU5wKdVhOsNQMYRc8dWnPqMKC4i6LjCKC4VzFvNGZVYJKzMU4K1WEzUqErGdQ4hKKpSKNzbaJU3hB9BI0ZAzU9NK31TmQzGdcJM0xLVcsLMYFGcZC5WOJc5eZyJuVwKyYeNJJeRUv6X8lYG8n5ac6-A8gZFE-o9EnUy0jOcK2cIIy7HVUeHvBcn8vcw8nqY8rjXPZeOKCCqSGC+s8JFCpC4mM0jjG8mZSJXYi3F6Uk6tKLYK2cYfSaYzVKNzOHMEqCpEkzF6VaLQ-raKJwX0n8h8p8xqJ+KOdhdkIzLVOdUC7S5KXjBKUzC8kqcnK8t8zaVhSYhKRYvGFrNzXzXOWqOY5zfchUHqNhWO9GNK9QXyfnHyzCgJT6hYL5M3G8jKd4ZJLGGdK9WJCwqJJa7bLhJcnqX8pjGcv7DjLjbKJPWONUkK2aOlWzQ4zOaYpwhKWWOckqkAA */
  id: 'legalCaseManagement',
  
  types: {
    context: {} as LegalCaseContext,
    events: {} as LegalCaseEvent,
  },

  context: {
    caseId: '',
    title: '',
    description: '',
    jurisdiction: '',
    caseType: 'civil',
    status: 'draft',
    priority: 'medium',
    assignedLawyers: [],
    createdBy: '',
    evidenceItems: [],
    personsOfInterest: [],
    timeline: [],
    analysis: {
      strengths: [],
      weaknesses: [],
      risks: [],
      recommendations: [],
      confidenceLevel: 0,
    },
    documents: [],
    deadlines: [],
    budget: {
      allocated: 0,
      spent: 0,
      remaining: 0,
    },
    progress: 0,
    errors: [],
    lastModified: 0,
    notifications: [],
    workflowStage: 'intake',
  },

  initial: 'idle',

  states: {
    idle: {
      on: {
        CREATE_CASE: {
          target: 'creating',
          actions: assign({
            title: ({ event }) => event.title,
            description: ({ event }) => event.description,
            caseType: ({ event }) => event.caseType as any,
            jurisdiction: ({ event }) => event.jurisdiction,
            createdBy: ({ event }) => event.createdBy,
            lastModified: () => Date.now(),
            workflowStage: 'intake',
          }),
        },
      },
    },

    creating: {
      invoke: {
        src: legalProgressTracker,
        id: 'progressTracker',
      },

      initial: 'validating',

      states: {
        validating: {
          invoke: {
            src: caseValidationActor,
            id: 'validationActor',
            input: ({ context }) => ({
              title: context.title,
              description: context.description,
              caseType: context.caseType,
              jurisdiction: context.jurisdiction,
            }),
          },

          on: {
            'xstate.done.actor.validationActor': {
              target: 'persisting',
              actions: [
                assign({ progress: 15 }),
                sendTo('progressTracker', { type: 'VALIDATION_COMPLETE' }),
              ],
            },

            'xstate.error.actor.validationActor': {
              target: '#legalCaseManagement.validationError',
              actions: assign({
                errors: ({ context, event }) => [
                  ...context.errors,
                  event.error?.message || 'Validation failed',
                ],
              }),
            },
          },
        },

        persisting: {
          invoke: {
            src: caseCreationActor,
            id: 'creationActor',
            input: ({ context }) => ({
              title: context.title,
              description: context.description,
              caseType: context.caseType,
              jurisdiction: context.jurisdiction,
              createdBy: context.createdBy,
            }),
          },

          on: {
            'xstate.done.actor.creationActor': {
              target: '#legalCaseManagement.draft',
              actions: [
                assign({
                  caseId: ({ event }) => event.output.caseId,
                  progress: 20,
                  status: 'draft',
                }),
                sendTo('progressTracker', { type: 'CASE_CREATED' }),
              ],
            },

            'xstate.error.actor.creationActor': {
              target: '#legalCaseManagement.creationError',
              actions: assign({
                errors: ({ context, event }) => [
                  ...context.errors,
                  `Case creation failed: ${event.error?.message || 'Unknown error'}`,
                ],
              }),
            },
          },
        },
      },

      on: {
        PROGRESS_UPDATE: {
          actions: assign({
            progress: ({ event }) => event.progress,
          }),
        },
      },
    },

    draft: {
      invoke: {
        src: legalProgressTracker,
        id: 'progressTracker',
      },

      on: {
        ADD_EVIDENCE: {
          actions: [
            assign({
              evidenceItems: ({ context, event }) => [...context.evidenceItems, event.evidenceId],
              lastModified: () => Date.now(),
            }),
            sendTo('progressTracker', { type: 'EVIDENCE_ADDED' }),
          ],
        },

        ADD_PERSON_OF_INTEREST: {
          actions: [
            assign({
              personsOfInterest: ({ context, event }) => [...context.personsOfInterest, event.personId],
              lastModified: () => Date.now(),
            }),
            sendTo('progressTracker', { type: 'POI_ADDED' }),
          ],
        },

        ADD_TIMELINE_EVENT: {
          actions: [
            assign({
              timeline: ({ context, event }) => [
                ...context.timeline,
                {
                  date: event.date,
                  event: event.event,
                  description: event.description,
                  category: event.category,
                },
              ],
              lastModified: () => Date.now(),
            }),
            sendTo('progressTracker', { type: 'TIMELINE_UPDATED' }),
          ],
        },

        ASSIGN_LAWYER: {
          actions: [
            assign({
              assignedLawyers: ({ context, event }) => [...context.assignedLawyers, event.lawyerId],
              lastModified: () => Date.now(),
            }),
            sendTo('progressTracker', { type: 'LAWYERS_ASSIGNED' }),
          ],
        },

        SET_DEADLINE: {
          actions: assign({
            deadlines: ({ context, event }) => [
              ...context.deadlines,
              {
                date: event.date,
                description: event.description,
                type: event.type as any,
                completed: false,
              },
            ],
            lastModified: () => Date.now(),
          }),
        },

        UPDATE_PRIORITY: {
          actions: assign({
            priority: ({ event }) => event.priority as any,
            lastModified: () => Date.now(),
          }),
        },

        CALCULATE_RISKS: {
          target: 'analyzing',
        },

        UPDATE_STATUS: [
          {
            target: 'active',
            guard: ({ event }) => event.status === 'active',
            actions: [
              assign({ status: 'active', workflowStage: 'investigation' }),
              sendTo('progressTracker', { type: 'CASE_ACTIVE' }),
            ],
          },
          {
            actions: assign({
              status: ({ event }) => event.status as any,
              lastModified: () => Date.now(),
            }),
          },
        ],

        PROGRESS_UPDATE: {
          actions: assign({
            progress: ({ event }) => event.progress,
          }),
        },
      },
    },

    analyzing: {
      invoke: {
        src: riskAnalysisActor,
        id: 'analysisActor',
        input: ({ context }) => ({
          caseId: context.caseId,
          context,
        }),
      },

      on: {
        'xstate.done.actor.analysisActor': {
          target: 'draft',
          actions: [
            assign({
              analysis: ({ event }) => event.output.analysis,
              lastModified: () => Date.now(),
            }),
            sendTo('progressTracker', { type: 'ANALYSIS_COMPLETE' }),
          ],
        },

        'xstate.error.actor.analysisActor': {
          target: 'draft',
          actions: assign({
            errors: ({ context, event }) => [
              ...context.errors,
              `Risk analysis failed: ${event.error?.message || 'Unknown error'}`,
            ],
          }),
        },
      },
    },

    active: {
      invoke: {
        src: legalProgressTracker,
        id: 'progressTracker',
      },

      entry: assign({
        workflowStage: 'investigation',
      }),

      on: {
        ADD_EVIDENCE: {
          actions: [
            assign({
              evidenceItems: ({ context, event }) => [...context.evidenceItems, event.evidenceId],
              lastModified: () => Date.now(),
            }),
            sendTo('progressTracker', { type: 'EVIDENCE_ADDED' }),
          ],
        },

        ADD_PERSON_OF_INTEREST: {
          actions: [
            assign({
              personsOfInterest: ({ context, event }) => [...context.personsOfInterest, event.personId],
              lastModified: () => Date.now(),
            }),
            sendTo('progressTracker', { type: 'POI_ADDED' }),
          ],
        },

        ADD_TIMELINE_EVENT: {
          actions: [
            assign({
              timeline: ({ context, event }) => [
                ...context.timeline,
                {
                  date: event.date,
                  event: event.event,
                  description: event.description,
                  category: event.category,
                },
              ],
              lastModified: () => Date.now(),
            }),
            sendTo('progressTracker', { type: 'TIMELINE_UPDATED' }),
          ],
        },

        COMPLETE_DEADLINE: {
          actions: assign({
            deadlines: ({ context, event }) =>
              context.deadlines.map((deadline, index) =>
                index.toString() === event.deadlineId
                  ? { ...deadline, completed: true }
                  : deadline
              ),
            lastModified: () => Date.now(),
          }),
        },

        UPDATE_STATUS: [
          {
            target: 'underReview',
            guard: ({ event }) => event.status === 'under_review',
            actions: assign({
              status: 'under_review',
              workflowStage: 'proceedings',
            }),
          },
          {
            target: 'completed',
            guard: ({ event }) => event.status === 'completed',
            actions: [
              assign({
                status: 'completed',
                workflowStage: 'resolution',
              }),
              sendTo('progressTracker', { type: 'CASE_COMPLETED' }),
            ],
          },
          {
            actions: assign({
              status: ({ event }) => event.status as any,
              lastModified: () => Date.now(),
            }),
          },
        ],

        ESCALATE: {
          target: 'escalated',
          actions: assign({
            priority: 'urgent',
            notifications: ({ context }) => [
              ...context.notifications,
              `Case ${context.caseId} has been escalated due to high priority issues`,
            ],
          }),
        },

        NOTIFY_STAKEHOLDERS: {
          target: 'notifying',
        },

        CALCULATE_RISKS: {
          target: 'analyzing',
        },

        PROGRESS_UPDATE: {
          actions: assign({
            progress: ({ event }) => event.progress,
          }),
        },
      },
    },

    notifying: {
      invoke: {
        src: stakeholderNotificationActor,
        id: 'notificationActor',
        input: ({ context, event }) => ({
          caseId: context.caseId,
          message: (event as any).message,
          recipients: (event as any).recipients,
          notificationType: 'case_update',
        }),
      },

      on: {
        'xstate.done.actor.notificationActor': {
          target: 'active',
          actions: assign({
            notifications: ({ context, event }) => [
              ...context.notifications,
              ...event.output.notifications.map((n: any) => `Notified ${n.recipient}: ${n.message}`),
            ],
          }),
        },

        'xstate.error.actor.notificationActor': {
          target: 'active',
          actions: assign({
            errors: ({ context, event }) => [
              ...context.errors,
              `Notification failed: ${event.error?.message || 'Unknown error'}`,
            ],
          }),
        },
      },
    },

    underReview: {
      entry: assign({
        workflowStage: 'proceedings',
      }),

      on: {
        UPDATE_STATUS: [
          {
            target: 'active',
            guard: ({ event }) => event.status === 'active',
            actions: assign({
              status: 'active',
              workflowStage: 'investigation',
            }),
          },
          {
            target: 'completed',
            guard: ({ event }) => event.status === 'completed',
            actions: assign({
              status: 'completed',
              workflowStage: 'resolution',
            }),
          },
        ],

        GENERATE_REPORT: {
          target: 'generatingReport',
        },
      },
    },

    generatingReport: {
      // Report generation logic would go here
      after: {
        2000: {
          target: 'underReview',
          actions: assign({
            documents: ({ context }) => [
              ...context.documents,
              `case_report_${context.caseId}_${Date.now()}`,
            ],
          }),
        },
      },
    },

    escalated: {
      entry: assign({
        priority: 'urgent',
        workflowStage: 'proceedings',
      }),

      on: {
        UPDATE_STATUS: [
          {
            target: 'active',
            guard: ({ event }) => event.status === 'active',
            actions: assign({
              status: 'active',
              priority: 'high', // Keep elevated priority
            }),
          },
          {
            target: 'completed',
            guard: ({ event }) => event.status === 'completed',
            actions: assign({
              status: 'completed',
              workflowStage: 'resolution',
            }),
          },
        ],
      },
    },

    completed: {
      entry: assign({
        status: 'completed',
        workflowStage: 'closure',
        progress: 100,
      }),

      on: {
        ARCHIVE_CASE: {
          target: 'archived',
          actions: assign({
            status: 'archived',
          }),
        },
      },
    },

    archived: {
      type: 'final',
      entry: assign({
        status: 'archived',
      }),
    },

    validationError: {
      on: {
        CREATE_CASE: {
          target: 'creating',
          actions: assign({
            title: ({ event }) => event.title,
            description: ({ event }) => event.description,
            caseType: ({ event }) => event.caseType as any,
            jurisdiction: ({ event }) => event.jurisdiction,
            createdBy: ({ event }) => event.createdBy,
            errors: [],
            lastModified: () => Date.now(),
          }),
        },
      },
    },

    creationError: {
      on: {
        CREATE_CASE: {
          target: 'creating',
          actions: assign({
            errors: [],
          }),
        },
      },
    },
  },
});

export default legalCaseManagementMachine;