# Appfinity AI Studio

## About This Project

A modern web application for Appfinity AI Studio - a technology studio focused on creating intelligent apps, web platforms, and automation-driven solutions.

## Technologies Used

This project is built with:

- **Vite** - Next generation frontend tooling
- **TypeScript** - Type-safe JavaScript
- **React** - UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable components built with Radix UI
- **React Router** - Client-side routing
- **TanStack Query** - Data synchronization

## Getting Started

### Prerequisites

- Node.js 18+ and npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd appfinity-studio-main

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
├── assets/        # Static assets (images, fonts)
└── index.css      # Global styles
```

## Deployment

Build the project for production:

```sh
npm run build
```

The optimized files will be in the `dist/` directory, ready to be deployed to any static hosting service.

## License

Proprietary - All rights reserved by Appfinity AI Studio
