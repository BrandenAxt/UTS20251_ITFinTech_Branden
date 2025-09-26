import { useRouter } from "next/router";
import { useState } from "react";

export default function PaymentPage() {
  const router = useRouter();
  const { checkoutId, amount } = router.query;
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit-card");
  const [shippingAddress, setShippingAddress] = useState("");

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          amount: Number(amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment gagal");

      const invoiceUrl =
        data.invoice?.invoice_url || data.xenditInvoice?.invoice_url;
      if (invoiceUrl) {
        window.location.href = invoiceUrl;
      } else {
        alert("Invoice URL tidak ditemukan di response");
      }
    } catch (err) {
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

            {/* Payment Method */}
            <div>
              <h2 className="text-base font-medium text-gray-800 mb-3">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="credit-card"
                    checked={paymentMethod === "credit-card"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-gray-700">Credit/Debit Card</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="paypal"
                    checked={paymentMethod === "paypal"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-gray-700">PayPal</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="other"
                    checked={paymentMethod === "other"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-gray-700">Other (E-Wallet, Bank Transfer)</span>
                </label>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <h2 className="text-base font-medium text-gray-800 mb-3">Order Summary</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Item(s)</span>
                  <span className="text-gray-800">Rp {Number(amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-800">Rp 0</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-800">Total</span>
                    <span className="text-gray-800">Rp {Number(amount || 0).toLocaleString()}</span>
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
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 text-center">
            <span className="text-sm text-gray-500">Payment</span>
          </div>
        </div>
      </div>
    </div>
  );
}