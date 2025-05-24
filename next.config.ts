
/**
 * @fileoverview Arquivo de configuração do Next.js.
 * Permite personalizar o comportamento do framework Next.js.
 */
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Aqui posso colocar várias opções de configuração do Next.js.
  // Por exemplo, desabilitar erros de build do TypeScript ou ESLint em produção (não recomendado pra produção real, mas útil em dev).
  typescript: {
    ignoreBuildErrors: true, // Decidi ignorar por enquanto pra agilizar o desenvolvimento.
  },
  eslint: {
    ignoreDuringBuilds: true, // Mesma coisa pro ESLint.
  },
  images: {
    // Configuração para otimização de imagens do Next.js, se eu fosse usar imagens externas.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co', // Exemplo, se usasse placehold.co para placeholders.
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
