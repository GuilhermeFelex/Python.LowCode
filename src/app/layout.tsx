
/**
 * @fileoverview Layout raiz da aplicação Next.js.
 * Define a estrutura HTML básica, inclui fontes globais, CSS e o Toaster para notificações.
 */
import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Carregando as fontes Geist Sans e Mono.
const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'Visual Script',
  description: 'Construa visualmente scripts Python com blocos arrastáveis.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR"> {/* Alterado para pt-BR para melhor acessibilidade */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster /> {/* Componente para exibir notificações (toasts) */}
      </body>
    </html>
  );
}
