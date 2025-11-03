import React from 'react';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabaseClient';

const Auth: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestore Finanziario AI</h1>
            <p className="text-slate-600 mt-2">Accedi per prendere il controllo delle tue finanze.</p>
        </header>
        <div className="bg-white p-8 rounded-xl shadow-lg">
             <SupabaseAuth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                providers={['google']}
                localization={{
                    variables: {
                        sign_in: {
                            email_label: 'Indirizzo email',
                            password_label: 'Password',
                            button_label: 'Accedi',
                            social_provider_text: 'Accedi con {{provider}}',
                            link_text: 'Hai già un account? Accedi',
                        },
                        sign_up: {
                            email_label: 'Indirizzo email',
                            password_label: 'Password',
                            button_label: 'Registrati',
                            link_text: 'Non hai un account? Registrati',
                        },
                        forgotten_password: {
                            email_label: 'Indirizzo email',
                            button_label: 'Invia istruzioni per il reset',
                            link_text: 'Password dimenticata?',
                        }
                    },
                }}
            />
        </div>
      </div>
    </div>
  );
};

export default Auth;