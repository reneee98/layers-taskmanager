"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function CreateTestUsersPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTestUsers = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test/create-test-users', {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create test users');
        return;
      }

      setResult(data);
      console.log('Test result:', data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test - Vytvorenie testovacích používateľov</CardTitle>
          <CardDescription>
            Tento nástroj vytvorí 2 testovacích používateľov a skontroluje, či sa automaticky pridali do Layers workspace.
            <br />
            <strong>Očakávaný výsledok po oprave:</strong> Používatelia by sa NEMALI automaticky pridať do Layers workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleCreateTestUsers} 
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Vytváram používateľov...' : 'Vytvoriť test používateľov'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              <Alert variant={result.message?.includes('PROBLEM') ? 'destructive' : 'default'}>
                <AlertDescription>
                  <strong>{result.message}</strong>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <strong>Členovia pred:</strong> {result.membersBefore}
                </div>
                <div>
                  <strong>Členovia po:</strong> {result.membersAfter}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Testovací používatelia:</h3>
                {result.testUsers?.map((user: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div>
                          <strong>Email:</strong> {user.email}
                        </div>
                        <div>
                          <strong>Heslo:</strong> <code className="bg-muted px-2 py-1 rounded">{user.password}</code>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <strong>User ID:</strong> {user.userId}
                        </div>
                        <div className={`mt-4 p-3 rounded-lg ${user.automaticallyAddedToLayers ? 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100 font-bold' : 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'}`}>
                          <strong>Automaticky pridaný do Layers?</strong>{' '}
                          {user.automaticallyAddedToLayers ? '❌ ÁNO (PROBLEM!)' : '✅ NIE (OK)'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

