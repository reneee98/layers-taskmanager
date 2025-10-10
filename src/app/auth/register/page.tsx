import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Laydo</h1>
          <p className="mt-2 text-sm text-gray-600">Alpha verzia 1.0</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Registrácia</CardTitle>
            <CardDescription className="text-center">
              Vytvorte si účet pre prístup k Laydo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Už máte účet?{" "}
                <Link 
                  href="/auth/login" 
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Prihláste sa
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
