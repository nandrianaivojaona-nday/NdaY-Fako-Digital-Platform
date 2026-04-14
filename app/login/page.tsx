import LoginForm from '../../components/auth/LoginForm';
import { ArrowLeft } from 'lucide-react'; // Optional: for a clean icon
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative">
    {/* Exit Button in the Top Left */ }
    <div className="absolute top-8 left-8">
    <Link 
      href="/" 
      className="flex items-center text-gray-500 hover:text-gray-800 transition-colors"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Cancel and return to home
    </Link>
  </div>

    <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">NdaY-Fako</h1>
          <p className="text-gray-600 mt-2">Waste Management Platform</p>
        </div>
        
        <LoginForm />

        {/* Secondary Exit option below the form */}
        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="text-sm text-gray-400 hover:underline"
          >
            Not an authorized user? View Public Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}