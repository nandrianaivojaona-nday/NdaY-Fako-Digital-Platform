"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { QrCode, CreditCard, Smartphone, Landmark, CheckCircle } from "lucide-react";

export default function ConfirmPage() {
  const router = useRouter();

  // State for Payment Method
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "credit_card" | "bank_transfer">("mobile_money");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Mocking the data passed from the previous screen (in production, fetch from Context, Redux, or API)
  const orderDetails = {
    planName: "Eco-Standard Weekly",
    operator: "GreenCity Logistics",
    location: "Antananarivo, Analamanga",
    bins: 2,
    totalPrice: "15,000 MGA / month",
  };

  const handlePayment = () => {
    setIsProcessing(true);
    
    // Mocking an API call to a payment gateway
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/citizen/dashboard");
      }, 3000);
    }, 2000);
  };

  const inputClass = "w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-colors";

  if (isSuccess) {
    return (
      <div className="page-container flex flex-col justify-center items-center min-h-[70vh] text-center space-y-6">
        <CheckCircle size={80} className="text-green-400 animate-pulse" />
        <h1 className="text-4xl font-bold text-white">Payment Successful!</h1>
        <p className="text-xl text-white/80">Your subscription is active. Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-container pb-20">
      {/* ================= HEADER ================= */}
      <header className="header">
        <div className="header-logo">
          <Logo />
        </div>
        <h1>Confirm & Pay</h1>
        <p className="subtitle">Review your subscription and finalize payment</p>
      </header>

      <div className="grid-3">
        {/* ================= LEFT COL: ORDER SUMMARY & QR ================= */}
        <section className="section mt-0!">
          <div className="card h-full flex flex-col justify-between">
            <div>
              <h3 className="text-teal-400 border-b border-white/10 pb-2 mb-4">Subscription Summary</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex justify-between">
                  <span>Plan:</span> <span className="font-bold text-white">{orderDetails.planName}</span>
                </li>
                <li className="flex justify-between">
                  <span>Operator:</span> <span className="font-bold text-white">{orderDetails.operator}</span>
                </li>
                <li className="flex justify-between">
                  <span>Location:</span> <span className="font-bold text-white text-right">{orderDetails.location}</span>
                </li>
                <li className="flex justify-between">
                  <span>QR Bins:</span> <span className="font-bold text-white">{orderDetails.bins}</span>
                </li>
              </ul>
              
              <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-lg">Total Due:</span>
                <span className="text-2xl font-bold text-green-300">{orderDetails.totalPrice}</span>
              </div>
            </div>

            {/* Mock QR Code Generation Preview */}
            <div className="mt-8 bg-white/5 p-4 rounded-xl border border-white/10 text-center">
              <p className="text-sm text-white/60 mb-3">Your Digital Address QR (Preview)</p>
              <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
                <QrCode size={100} className="text-gray-900" />
              </div>
              <p className="text-xs text-teal-300 mt-3">Ready to print upon confirmation</p>
            </div>
          </div>
        </section>

        {/* ================= MID/RIGHT COL: PAYMENT Gateway ================= */}
        <section className="section mt-0! col-span-1 sm:col-span-2">
          <div className="card space-y-6">
            <h3 className="text-teal-400 mb-2">Select Payment Method</h3>
            
            {/* Payment Tabs */}
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setPaymentMethod("mobile_money")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${paymentMethod === "mobile_money" ? "bg-teal-600/40 border-teal-400" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
              >
                <Smartphone size={24} className="mb-2 text-white" />
                <span className="text-sm font-semibold">Mobile Money</span>
              </button>

              <button 
                onClick={() => setPaymentMethod("credit_card")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${paymentMethod === "credit_card" ? "bg-teal-600/40 border-teal-400" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
              >
                <CreditCard size={24} className="mb-2 text-white" />
                <span className="text-sm font-semibold">Bank / Card</span>
              </button>

              <button 
                onClick={() => setPaymentMethod("bank_transfer")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${paymentMethod === "bank_transfer" ? "bg-teal-600/40 border-teal-400" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
              >
                <Landmark size={24} className="mb-2 text-white" />
                <span className="text-sm font-semibold">Transfer</span>
              </button>
            </div>

            {/* Dynamic Payment Forms based on selection */}
            <div className="min-h-250 p-4 bg-black/20 rounded-xl border border-white/5">
              
              {paymentMethod === "mobile_money" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-sm text-white/70">Pay instantly via MVola, Orange Money, or Airtel Money.</p>
                  <input className={inputClass} placeholder="Mobile Number (e.g., 034...)" type="tel" />
                  <p className="text-xs text-white/50">A prompt will be sent to your phone to enter your PIN and confirm the transaction.</p>
                </div>
              )}

              {paymentMethod === "credit_card" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                   <p className="text-sm text-white/70">Pay securely with Visa or Mastercard.</p>
                  <input className={inputClass} placeholder="Card Number" type="text" />
                  <div className="grid grid-cols-2 gap-4">
                    <input className={inputClass} placeholder="MM/YY" type="text" />
                    <input className={inputClass} placeholder="CVC" type="text" />
                  </div>
                </div>
              )}

              {paymentMethod === "bank_transfer" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-sm text-white/70">Transfer exact funds to the Operator's account below. Your service will activate once verified.</p>
                  <div className="bg-white/5 p-3 rounded border border-white/10 text-sm font-mono">
                    Bank: BNI Madagascar<br/>
                    RIB: 0000 1111 2222 3333 44<br/>
                    Beneficiary: GreenCity Logistics
                  </div>
                  <input className={inputClass} placeholder="Upload Transfer Receipt (Optional)" type="file" />
                </div>
              )}

            </div>

            <button
              className={`button w-full py-4 text-lg font-bold flex justify-center items-center gap-2 ${isProcessing ? "opacity-70 cursor-not-allowed" : ""}`}
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                "Confirm & Pay"
              )}
            </button>
            
          </div>
        </section>
      </div>
    </div>
  );
}