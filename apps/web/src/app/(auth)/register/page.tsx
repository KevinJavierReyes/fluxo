'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

const registerSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp(values);
    if (error) {
      setServerError(error.message);
      return;
    }
    if (data.session) {
      router.push('/dashboard');
      router.refresh();
      return;
    }
    setNeedsEmailConfirmation(true);
  };

  if (needsEmailConfirmation) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Revisa tu correo</h1>
        <p className="text-gray-600">
          Te enviamos un enlace de confirmación. Confírmalo para poder iniciar sesión.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Crear cuenta en Fluxo</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Correo
          </label>
          <input
            id="email"
            type="email"
            className="rounded border px-3 py-2"
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className="rounded border px-3 py-2"
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
      <p className="text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="underline">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
