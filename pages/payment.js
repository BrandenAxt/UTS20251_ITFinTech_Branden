import { useRouter } from "next/router";
import { useState } from "react";

export default function PaymentPage() {
  const router = useRouter();
  const { checkoutId, amount } = router.query;
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          amount: Number(amount),
          phoneNumber,
        }),
      });

      // Try parse json safely
      let data;
      try {
        data = await res.json();
      } catch (e) {
        const text = await res.text();
        console.error("Non-JSON response from /api/payment:", text);
        alert("Server returned non-JSON response. Cek console/logs.");
        return;
      }

      if (!data || !data.success) {
        const msg = (data && (data.message || data.detail)) || "Payment gagal";
        throw new Error(msg);
      }

      // If server returns snap redirect (SNAP flow) -> redirect
      if (data.snap_redirect_url) {
        window.location.href = data.snap_redirect_url;
        return;
      }

      // If server returns snap token instead (rare), build redirect
      if (data.snap_token && data.snap_token.startsWith("SNAP-")) {
        // If server sends only token, construct Snap redirect url (snap v4)
        // NOTE: midtrans redirect url format may vary; preferred is redirect_url from server.
        const redirectUrl = `https://app.midtrans.com/snap/v1/transactions/${data.snap_token}/payment`;
        window.location.href = redirectUrl;
        return;
      }

      // If server accidentally returned QR (core) -> inform dev
      if (data.qr_url || data.qrUrl || data.qr) {
        console.warn("Server returned QR (Core API) while frontend expects SNAP.", data);
        alert("Server memberikan QR (Core API). Aplikasi ini sudah di-set untuk SNAP. Cek backend.");
        return;
      }

      // fallback
      throw new Error("SNAP URL/token tidak ditemukan di response server.");
    } catch (err) {
      console.error("Payment error:", err);
      alert("Error: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-800 mr-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-800 flex-1 text-center mr-9">
                Checkout
              </h1>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Phone Number */}
            <div>
              <h2 className="text-base font-medium text-gray-800 mb-3">Phone Number</h2>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number..."
                className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 placeholder-gray-500 text-gray-800"
              />
            </div>

            {/* Order Summary */}
            <div>
              <h2 className="text-base font-medium text-gray-800 mb-3">Order Summary</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Item(s)</span>
                  <span className="text-gray-800">
                    Rp {Number(amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-800">Rp 0</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-800">Total</span>
                    <span className="text-gray-800">
                      Rp {Number(amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? "Processing..." : "Confirm & Pay"}
            </button>

            <div className="text-xs text-gray-500 text-center mt-3">
              Note: This flow uses Midtrans SNAP. You will be redirected to Midtrans payment page.
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 text-center">
            <span className="text-sm text-gray-500">Payment via Midtrans SNAP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
