# Real-World Test Prompts

Practical, realistic test prompts based on actual business scenarios you can use to test the intent library system.

## Executive & Strategy - Real-World Scenarios

### 1. Strategic Planning
```
Intent: Strategic planning
Context: We need to expand our SaaS platform into the European market in Q3 2024. Our current revenue is $2M annually, and we have a team of 25 employees. Budget constraint: $500K for expansion. Need to decide between establishing a local office or working with distributors.
Model: llama3
```

### 2. Decision Making
```
Intent: Decision making
Context: Our current database infrastructure is struggling with 10x user growth. We need to decide: (1) Scale existing PostgreSQL setup with read replicas ($200K), (2) Migrate to AWS RDS with auto-scaling ($150K setup + $50K/month), or (3) Implement sharding on current infrastructure ($300K one-time). Decision needed within 2 weeks.
Model: llama3
```

### 3. Risk Assessment
```
Intent: Risk assessment
Context: Our fintech startup is launching a new peer-to-peer lending feature. We need to assess regulatory risks in US, UK, and EU markets. Our current compliance team has 3 people. Feature launch planned in 6 months.
Model: llama3
```

### 4. Scenario Analysis
```
Intent: Scenario analysis
Context: What happens to our cash flow if our largest client (30% of revenue) doesn't renew their annual contract next quarter? Current monthly burn rate is $150K, we have $2M in runway. Need contingency plans.
Model: llama3
```

### 5. Market Entry Analysis
```
Intent: Market entry analysis
Context: We're a B2B SaaS company ($5M ARR) considering entering the healthcare sector. Currently serve tech companies. Need to analyze market entry strategy, compliance requirements (HIPAA), competitive landscape, and resource requirements.
Model: llama3
```

## Product Management - Real-World Scenarios

### 6. Requirements Definition
```
Intent: Requirements definition
Context: We're building a mobile app for real estate agents. Key features needed: property search with filters, virtual tour booking, document management, client communication, and commission tracking. Must work offline. Target: 10,000 active users in first year.
Model: mistral
```

### 7. Feature Ideation
```
Intent: Feature ideation
Context: Our e-commerce platform has a 15% cart abandonment rate. Users are dropping off at checkout. We need feature ideas to reduce abandonment and increase conversion. Current conversion rate is 2.5%.
Model: mistral
```

### 8. Roadmap Planning
```
Intent: Roadmap planning
Context: We have 3 months before our next funding round. Need to prioritize: AI-powered recommendations engine, mobile app redesign, new payment gateway integration, analytics dashboard v2, or API v3 launch. Which gives best ROI for investor demo?
Model: mistral
```

### 9. Prioritization
```
Intent: Prioritization
Context: Engineering team has capacity for 3 features this quarter. Requests: (1) Dark mode UI (high user demand, 2 weeks), (2) Multi-language support (enterprise client requirement, 4 weeks), (3) Performance optimization (technical debt, 3 weeks), (4) SSO integration (sales blocker, 2 weeks). How to prioritize?
Model: mistral
```

### 10. Launch Planning
```
Intent: Launch planning
Context: Launching our AI assistant feature to 50,000 beta users next month. Need launch plan including: marketing campaign, customer support preparation, monitoring and alerts, rollback procedures, success metrics, and communication strategy.
Model: mistral
```

## Engineering & Technical - Real-World Scenarios

### 11. Code Generation
```
Intent: Code generation
Context: Generate a REST API endpoint in Node.js/Express for user authentication. Requirements: POST /api/auth/login that accepts email/password, validates credentials against PostgreSQL, returns JWT token, includes rate limiting (5 requests/minute), error handling, and logs authentication attempts.
Model: codellama
```

### 12. Code Review
```
Intent: Code review
Context: Review this authentication middleware code for security vulnerabilities: uses bcrypt for password hashing, JWT tokens stored in localStorage, session timeout of 24 hours, no 2FA implementation. Check for security best practices and potential vulnerabilities.
Model: codellama
```

### 13. Debugging
```
Intent: Debugging
Context: Our production API is experiencing memory leaks. Memory usage grows from 500MB to 2GB over 24 hours, causing server crashes. Stack: Node.js, Express, PostgreSQL with connection pooling. No obvious memory leaks in code review. Need debugging approach.
Model: codellama
```

### 14. Performance Optimization
```
Intent: Performance optimization
Context: Database query takes 8 seconds for user dashboard. Query joins 5 tables (users, orders, payments, products, reviews) with 1M+ records. Currently using LEFT JOINs. Need optimization strategies to reduce to <1 second.
Model: codellama
```

### 15. Architecture Design
```
Intent: Architecture design
Context: Design microservices architecture for e-commerce platform. Current monolith handles: user management, product catalog, order processing, payment, inventory, shipping. Expected scale: 100K daily active users, 10K orders/day. Need service boundaries and communication patterns.
Model: codellama
```

## Sales - Real-World Scenarios

### 16. Lead Qualification
```
Intent: Lead qualification
Context: Enterprise lead from Fortune 500 company. Initial inquiry about our SaaS platform. Company size: 10,000 employees, industry: financial services, budget: "to be determined", timeline: "exploring options", decision maker: VP of Engineering. How to qualify and next steps?
Model: mistral
```

### 17. Sales Messaging
```
Intent: Sales messaging
Context: Create sales messaging for our project management SaaS platform targeting mid-market companies (100-1000 employees). Key differentiators: AI-powered task prioritization, integration with 50+ tools, enterprise security, customizable workflows. Pricing: $15/user/month.
Model: mistral
```

### 18. Pitch Creation
```
Intent: Pitch creation
Context: 5-minute investor pitch for seed funding round. We're a B2B SaaS company: $500K ARR, 200 customers, 40% month-over-month growth, team of 12, seeking $3M seed round. Need pitch structure: problem, solution, market, traction, ask.
Model: mistral
```

### 19. Proposal Drafting
```
Intent: Proposal drafting
Context: Draft proposal for enterprise client (5,000 employees) for our platform. Requirements: 500 user licenses, SSO integration, dedicated support, SLA 99.9%, custom integrations, 3-year contract. Our standard pricing: $20/user/month with volume discounts.
Model: mistral
```

### 20. Pricing Strategy
```
Intent: Pricing strategy
Context: We're a SaaS startup with freemium model. Current pricing: Free (up to 3 users), Pro ($29/month for 10 users), Enterprise (custom). Competitors charge $25-35/user/month. Need pricing strategy review - should we introduce annual plans, volume discounts, or change pricing tiers?
Model: mistral
```

## Marketing & Growth - Real-World Scenarios

### 21. Market Research
```
Intent: Market research
Context: Research the customer data platform (CDP) market. Our target: B2B SaaS companies with $10M-100M revenue. Need to understand: market size, key players, pricing models, customer pain points, growth trends, and competitive positioning opportunities.
Model: mistral
```

### 22. Audience Segmentation
```
Intent: Audience segmentation
Context: We have 5,000 customers using our project management tool. Segment them for targeted marketing. Data available: company size, industry, usage patterns, feature adoption, subscription tier, churn risk, expansion potential. Need actionable segments.
Model: mistral
```

### 23. Campaign Planning
```
Intent: Campaign planning
Context: Launch marketing campaign for Q2 2024. Goal: 500 new signups, $50K new MRR. Budget: $30K. Channels available: Google Ads, LinkedIn Ads, content marketing, webinars, partner referrals. Target: SMB companies (50-200 employees) in tech and professional services.
Model: mistral
```

### 24. Content Ideation
```
Intent: Content ideation
Context: Generate content ideas for our B2B SaaS blog targeting IT managers and CTOs. Topics: DevOps, cloud infrastructure, security, team productivity. Goal: drive organic traffic and lead generation. Need 10 article ideas with SEO focus.
Model: mistral
```

### 25. Brand Positioning
```
Intent: Brand positioning
Context: Our project management tool competes with Asana, Monday.com, and Jira. Our differentiator: AI-powered automation and predictive analytics. Target audience: mid-market tech companies. Need brand positioning statement and messaging framework.
Model: mistral
```

## HR & People Ops - Real-World Scenarios

### 26. Hiring Strategy
```
Intent: Hiring strategy
Context: We're a 50-person startup scaling to 100 employees in 12 months. Need to hire: 20 engineers, 10 sales reps, 5 customer success, 3 product managers, 2 designers, and 10 support roles. Budget: $2M for salaries. Create hiring plan with timeline and priorities.
Model: llama3
```

### 27. Job Description Creation
```
Intent: Job description creation
Context: Create job description for Senior Full Stack Engineer. Requirements: 5+ years experience, React/Node.js, PostgreSQL, AWS, team leadership experience. Remote-friendly, equity package, $140K-180K salary range. Startup environment, fast-paced, opportunity to shape product.
Model: llama3
```

### 28. Performance Reviews
```
Intent: Performance reviews
Context: Draft performance review for mid-level engineer (2 years at company). Strengths: strong technical skills, good code quality, reliable. Areas for growth: communication with non-technical stakeholders, mentoring junior developers, taking ownership of larger features.
Model: llama3
```

### 29. Onboarding Design
```
Intent: Onboarding design
Context: Design 30-day onboarding program for new engineers joining our 30-person engineering team. Stack: React, Node.js, TypeScript, PostgreSQL, AWS. Need to cover: codebase orientation, development workflow, team culture, tooling setup, first project assignment.
Model: llama3
```

### 30. Compensation Benchmarking
```
Intent: Compensation benchmarking
Context: Benchmark engineering salaries for our startup (50 employees, Series A, San Francisco). Roles: Senior Engineer ($140K current), Staff Engineer ($180K current), Engineering Manager ($200K current). Need market rates and recommendations for adjustments.
Model: llama3
```

## Finance - Real-World Scenarios

### 31. Budget Planning
```
Intent: Budget planning
Context: Create Q2 2024 budget for SaaS startup. Current MRR: $150K, expected growth: 20% MoM. Categories: Engineering (40%), Sales (25%), Marketing (15%), Operations (10%), Admin (10%). Headcount: growing from 50 to 65 employees. Plan for 3 months.
Model: llama3
```

### 32. Financial Modeling
```
Intent: Financial modeling
Context: Build financial model for new product line. Investment: $500K development, $200K marketing. Expected: $50K MRR by month 6, $200K MRR by month 12. Customer acquisition cost: $500, LTV: $5,000. Need 3-year projection with break-even analysis.
Model: llama3
```

### 33. Cost Analysis
```
Intent: Cost analysis
Context: Analyze cost of cloud infrastructure migration. Current: On-premise servers ($50K/year), 3 IT staff ($300K/year). Proposed: AWS migration, estimated $80K/year infrastructure, reduce to 1 IT staff ($120K/year). Need total cost comparison and ROI.
Model: llama3
```

### 34. Revenue Forecasting
```
Intent: Revenue forecasting
Context: Forecast revenue for next 12 months. Current ARR: $1.8M, growth rate: 15% MoM, churn: 3% monthly, average contract value: $15K, sales cycle: 60 days, pipeline: $500K in qualified opportunities. Need monthly and annual projections.
Model: llama3
```

### 35. ROI Analysis
```
Intent: ROI analysis
```
Context: Calculate ROI for marketing automation platform investment. Cost: $24K/year software + $60K/year marketing manager. Expected impact: 30% increase in lead generation, 20% improvement in conversion rate. Current: 1,000 leads/month, 10% conversion, $5K average deal value.
Model: llama3
```

## Legal & Compliance - Real-World Scenarios

### 36. Contract Review
```
Intent: Contract review
Context: Review SaaS vendor service agreement. Key terms: 3-year commitment, auto-renewal, $50K/year, termination requires 90-day notice, liability cap at annual fee, data processing addendum mentions GDPR but lacks specific safeguards. Identify risks and recommendations.
Model: llama3
```

### 37. Compliance Checklist
```
Intent: Compliance checklist
Context: Create GDPR compliance checklist for SaaS platform collecting user data (name, email, usage analytics, payment info). We're EU-based, serve EU customers, use AWS (US-based), have 10,000 users. Need checklist for data protection, user rights, breach procedures.
Model: llama3
```

### 38. Privacy Assessment
```
Intent: Privacy assessment
Context: Assess privacy implications of implementing AI feature that analyzes user behavior to provide personalized recommendations. We collect: browsing history, interaction patterns, purchase history. Users: B2B customers, data stored in cloud, shared with third-party AI service. Need privacy risk assessment.
Model: llama3
```

### 39. Regulatory Analysis
```
Intent: Regulatory analysis
Context: Analyze regulatory requirements for launching fintech feature (payment processing) in US, UK, and EU. Current status: SaaS company, not licensed for financial services. New feature: enables customers to process payments. Need regulatory analysis and licensing requirements.
Model: llama3
```

### 40. Policy Interpretation
```
Intent: Policy interpretation
Context: Interpret company remote work policy. Policy states: "Remote work allowed for roles not requiring physical presence, subject to manager approval, must be available during core hours (9am-5pm local time)." Employee requests: work from different country (timezone difference 8 hours), maintain same role. Is this allowed?
Model: llama3
```

## AI & Automation - Real-World Scenarios

### 41. Prompt Creation
```
Intent: Prompt creation
Context: Create prompt for customer support chatbot. Purpose: answer common questions about our SaaS platform (pricing, features, integrations, troubleshooting). Tone: friendly and professional. Should escalate to human for complex issues. Integration: with our knowledge base and ticketing system.
Model: codellama
```

### 42. Workflow Automation
```
Intent: Workflow automation
Context: Automate customer onboarding workflow. Current: manual process (welcome email, account setup, product tour, first task assignment) takes 2 hours per customer. Need to automate using AI/automation tools. Goal: reduce to 15 minutes, maintain personalization, ensure quality.
Model: codellama
```

### 43. Model Selection
```
Intent: Model selection
Context: Select LLM model for customer support use case. Requirements: handle 1,000 tickets/day, response time <2 seconds, accuracy >90%, cost <$0.10 per interaction, support multiple languages. Options: GPT-4, Claude, Llama 3, Mistral, or custom fine-tuned model. Which to choose?
Model: codellama
```

### 44. AI Risk Assessment
```
Intent: AI risk assessment
Context: Assess risks of deploying AI system for automated loan approval decisions. System: analyzes credit scores, income, employment history. Decision: approve/deny loans up to $50K. Regulatory: financial services, fair lending laws apply. Risks: bias, errors, regulatory compliance, customer trust.
Model: llama3
```

### 45. Prompt Optimization
```
Intent: Prompt optimization
Context: Optimize LLM prompt for code generation. Current prompt: "Generate code for user authentication" - produces inconsistent results. Need: reliable output, follows best practices, includes error handling, security considerations, matches our coding standards. How to improve prompt?
Model: codellama
```

## How to Use These Prompts

### Option 1: Test with buildPrompt Function

```typescript
import { buildPrompt } from './src/intent-library-loader';

// Example: Strategic Planning
const prompt = buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Strategic planning',
  'llama3',
  'We need to expand our SaaS platform into the European market in Q3 2024. Our current revenue is $2M annually, and we have a team of 25 employees. Budget constraint: $500K for expansion.'
);

console.log(prompt);
```

### Option 2: Test via Frontend (Full System)

1. Start all services
2. Open frontend at `http://localhost:3000`
3. Navigate to "Create Intent"
4. Paste any of these real-world prompts
5. Submit and view results

### Option 3: Direct API Testing

```bash
curl -X POST http://localhost:7001/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "We need to expand our SaaS platform into the European market in Q3 2024. Our current revenue is $2M annually, and we have a team of 25 employees. Budget constraint: $500K for expansion.",
    "actorId": "user-123",
    "actorRole": "USER"
  }'
```

## Testing Tips

1. **Start Simple**: Test with shorter contexts first
2. **Vary Models**: Try different models (llama3, mistral, codellama)
3. **Check Outputs**: Verify that responses match the JSON schema
4. **Test Edge Cases**: Try with minimal context, very long context, or ambiguous intents
5. **Compare Results**: Test same intent with different models to see variations

## Expected Results

Each prompt should return structured JSON:
```json
{
  "summary": "Brief summary of analysis",
  "details": ["Detailed point 1", "Detailed point 2"],
  "risks": ["Risk 1", "Risk 2"],
  "next_steps": ["Action 1", "Action 2"]
}
```

Plus engine-specific fields (decision, requirements, policies, etc.)
