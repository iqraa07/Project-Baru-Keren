import { Facebook, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-12 py-8 border-t border-gray-200">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-6">
          <a
            href="https://wa.me/6282296813933"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-medium shadow-md"
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp
          </a>
          <a
            href="https://www.facebook.com/iqraa07/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium shadow-md"
          >
            <Facebook className="w-5 h-5" />
            Facebook
          </a>
        </div>
        <p className="text-xs text-gray-500">
          CGV Cinemas - Kalkulator Promo Tiket
        </p>
      </div>
    </footer>
  );
}
