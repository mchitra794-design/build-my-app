# ClockIt - Staff Attendance & Analytics System

A modern web-based attendance management system built with React, TypeScript, and Supabase. Features real-time attendance tracking, predictive analytics, and gamified engagement for organizations.

## 🎯 Features

### Core Features
- **Smart Attendance Tracking** - Daily marking with check-in/out times
- **Admin Dashboard** - Organization-wide attendance analytics
- **Staff Portal** - Personal attendance tracking and performance
- **Attendance Analytics** - Charts, trends, and department-wise analysis
- **AI Risk Predictions** - Prototype ML-powered absence risk forecasting
- **Real-time Notifications** - Alerts for shortages and events
- **Event Management** - Meetings, holidays, and training schedules
- **Gamification** - Points, badges, streaks, and leaderboards

### Tech Stack
- **Frontend**: React 19 + TypeScript
- **Routing**: TanStack Router
- **Data Fetching**: TanStack React Query
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Email/Password)
- **Charts**: Recharts
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui
- **Deployment**: Vercel (Frontend) + Supabase (Backend)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- GitHub account
- Vercel account

### 1. Supabase Setup

See [SETUP.md](./SETUP.md) for detailed instructions:

1. Create Supabase project
2. Get API credentials
3. Run migrations
4. Seed demo data
5. Create admin user

### 2. Local Development

```bash
# Clone repository
git clone https://github.com/mchitra794-design/build-my-app.git
cd build-my-app

# Install dependencies
npm install

# Create .env.local with Supabase credentials
echo "VITE_SUPABASE_URL=https://your-project.supabase.co" > .env.local
echo "VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key" >> .env.local

# Start dev server
npm run dev
```

Visit http://localhost:5173

### 3. Test Login

**Admin Account:**
- Email: `admin@example.com`
- Password: (from setup)

**Staff Accounts:**
- Email: Any from seed data (e.g., `john.smith@example.com`)
- Password: Set in Supabase Auth

## 📊 Project Structure

```
build-my-app/
├── src/
│   ├── routes/              # Page components
│   │   ├── _authenticated/  # Protected routes
│   │   │   ├── dashboard.tsx
│   │   │   ├── attendance.tsx
│   │   │   ├── staff.index.tsx
│   │   │   ├── analytics.tsx
│   │   │   ├── ai-insights.tsx
│   │   │   └── ...more routes
│   │   └── index.tsx        # Login page
│   ├── components/          # Reusable UI
│   │   └── clockit/
│   │       ├── AppShell.tsx
│   │       ├── StatCard.tsx
│   │       └── StatusPill.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.tsx      # Auth context
│   │   └── useClockitData.tsx # Data fetching
│   ├── lib/
│   │   ├── clockit.ts       # Business logic
│   │   └── queries.ts       # Supabase queries
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts    # Supabase client
│   └── styles.css           # Tailwind + theme
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql     # Database schema
│   ├── seed.sql             # Demo data
│   └── rpc_functions.sql    # Database functions
├── SETUP.md                 # Setup guide
└── package.json
```

## 🔐 Authentication Flow

1. User enters email/password on login page
2. Supabase Auth validates credentials
3. Session token stored in browser
4. `useAuth()` hook fetches user profile
5. Protected routes check authentication
6. Profile data synced with attendance records

## 📱 Pages & Routes

### Public Routes
- `/` - Login page

### Protected Routes (Authenticated Users)

**Admin Routes:**
- `/dashboard` - Organization overview
- `/staff` - Staff directory
- `/staff/$id` - Individual staff profile
- `/attendance` - Daily attendance marking
- `/calendar` - Event calendar
- `/analytics` - Attendance analytics
- `/ai-insights` - Risk predictions
- `/notifications` - Notification center
- `/gamification` - Leaderboard & badges

**Staff Routes:**
- `/dashboard` - Personal dashboard
- `/attendance` - My attendance history
- `/calendar` - Event calendar
- `/notifications` - Notifications
- `/achievements` - Badges earned
- `/leaderboard` - Leaderboard
- `/profile` - Profile settings

## 🗄️ Database Schema

### Tables
- `profiles` - Staff directory
- `attendance` - Daily records
- `events` - Meetings, holidays, etc.
- `notifications` - User notifications
- `badges` - Achievement badges
- `user_roles` - Admin/staff roles
- `org_settings` - Organization configuration

See `supabase/migrations/001_init.sql` for full schema.

## 🔑 Key Features Explained

### Attendance Tracking
- Mark staff attendance daily
- Track check-in/check-out times
- Support: present, late, half_day, leave, absent
- View historical records

### Analytics
- Real-time attendance percentage
- Department-wise trends
- Daily attendance line charts
- Status breakdown pie charts
- Critical/warning tier classification

### AI Insights
- Predictive attendance modeling
- Recent vs. long-term trends
- Consecutive absence detection
- Risk scoring (low/medium/high)
- Decision support explanations

### Gamification
- Points for attendance
- Streak tracking (consecutive working days)
- Badge achievements
- Leaderboard rankings
- Visual progress indicators

## 🚢 Deployment

### Deploy to Vercel

```bash
# Push to GitHub
git push origin main

# Go to vercel.com
# 1. Click "Add New Project"
# 2. Select GitHub repository
# 3. Add environment variables:
#    VITE_SUPABASE_URL
#    VITE_SUPABASE_PUBLISHABLE_KEY
# 4. Click Deploy
```

### Environment Variables (Vercel)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## 🔧 Development

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## 🧪 Testing

### Test Admin Features
1. Login as admin
2. Go to `/attendance`
3. Mark attendance for multiple staff
4. View `/dashboard` analytics
5. Check `/ai-insights` predictions

### Test Staff Features
1. Login as regular staff
2. View `/dashboard` (personal)
3. Check `/attendance` history
4. View `/calendar` events
5. Check points and badges

## 🐛 Troubleshooting

**"Missing Supabase environment variable"**
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env.local`
- Restart dev server

**"Authentication failed"**
- Verify user exists in Supabase Auth
- Check profile email matches
- Ensure profile is linked to auth user

**"No data loading"**
- Check Supabase connection
- Verify RLS policies aren't blocking access
- Check browser console for errors

**Routes returning 404**
- Run `npm run build` to regenerate route tree
- Clear `.tanstack/router` cache
- Restart dev server

## 📚 Resources

- [TanStack Start Docs](https://tanstack.com/start)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)

## 📄 License

MIT License - see LICENSE file

## 🤝 Support

For issues or questions:
1. Check [SETUP.md](./SETUP.md) troubleshooting section
2. Review Supabase logs
3. Check Vercel deployment logs
4. Open GitHub issues

## 🎉 Next Steps

After deployment:
1. Customize organization name
2. Add more staff profiles
3. Configure email notifications
4. Set up auth email templates
5. Enable multi-factor authentication
6. Add custom domain

---

**Built with ❤️ for modern attendance management**
