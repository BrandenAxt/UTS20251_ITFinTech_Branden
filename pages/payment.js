import { useRouter } from "next/router";
import { useState } from "react";

export default function PaymentPage() {
  const router = useRouter();
  const { checkoutId, amount } = router.query;
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit-card");
  const [shippingAddress, setShippingAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // TANPA TYPE
  const [qrUrl, setQrUrl] = useState(null);
  const [orderId, setOrderId] = useState(null);

  const handlePay = async () => {
    setLoading(true);
    setQrUrl(null);
    setOrderId(null);

    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          amount: Number(amount),
          phoneNumber,
          shippingAddress,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Payment gagal");
      }

      const mid = data.midtrans;
      setOrderId(data.orderId);

      // buang `: any`, biarin JS biasa
      const qr =
        mid?.actions?.find(a => a.name === "generate-qr-code")?.url ||
        mid?.qr_url ||
        null;

      if (!qr) {
        console.error("Response Midtrans:", mid);
        alert("QR URL tidak ditemukan di response Midtrans. Cek log backend.");
        return;
      }

      setQrUrl(qr);
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
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
            {/* Shipping Address */}
            <div>
              <h2 className="text-base font-medium text-gray-800 mb-3">Shipping Address</h2>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter your full shipping address..."
                className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 resize-none placeholder-gray-500 text-gray-800"
                rows={3}
              />
            </div>

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

            {/* QR Section */}
            {qrUrl && (
              <div className="mt-4 border-t pt-4">
                <h2 className="text-base font-medium text-gray-800 mb-3">
                  Scan QRIS untuk bayar
                </h2>
                <div className="flex flex-col items-center space-y-2">
                  <img
                    src={qrUrl}
                    alt="QRIS"
                    className="w-48 h-48 object-contain border rounded-lg bg-white"
                  />
                  {orderId && (
                    <p className="text-xs text-gray-500">Order ID: {orderId}</p>
                  )}
                  <p className="text-xs text-gray-500 text-center">
                    Gunakan aplikasi pembayaran yang mendukung QRIS
                    (GoPay, OVO, ShopeePay, dll)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 text-center">
            <span className="text-sm text-gray-500">Payment via Midtrans QRIS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
