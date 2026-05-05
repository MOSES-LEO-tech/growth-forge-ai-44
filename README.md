# Milestone

Milestone is a student portfolio platform for schools, students, and parents. It helps teams document achievements, collect projects, manage galleries, track scholarship opportunities, and keep verified growth records in one place.

## User Roles

- **Students**: Build portfolios, track achievements, manage projects, and discover opportunities.
- **Parents**: Monitor student progress, view achievements, and stay updated on school events.
- **Teachers**: Review student projects, verify achievements, and manage school-wide galleries.
- **Admins**: Manage school data, configure global settings, and oversee platform integrity.

## Key Features

- **Digital Portfolio**: Showcase projects and achievements with media support.
- **Guidance**: Personalized scholarship matches and profile improvement tips.
- **Scholarship Tracker**: Kanban-style board to manage scholarship applications.
- **School Network**: Profiles for partner institutions with student population and achievement metrics.
- **Growth Analytics**: Track progress and portfolio completeness over time.

## Local Development Setup

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or Node.js (v20+)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (for local Supabase instance)

### Setup Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/MOSES-LEO-tech/growth-forge-ai-44.git
   cd growth-forge-ai-44
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Initialize Supabase**:
   ```bash
   supabase start
   ```

4. **Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start development server**:
   ```bash
   bun run dev
   ```

## Testing
Run E2E tests with Playwright:
```bash
bun x playwright test
```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
