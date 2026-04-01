import { Outlet, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
            <BookOpen className="w-6 h-6" />
            <h1 className="text-xl font-bold">مكتبة الروايات</h1>
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>
    </div>
  );
}
