import React, { useState, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import customerAuthService from '../../services/customerAuth.service';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import GoogleSignInButton from '../../components/customer/GoogleSignInButton';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  Sparkles,
  ShieldCheck,
  Package,
  Truck,
  BadgeCheck,
  MailCheck
} from 'lucide-react';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const step1Schema = z
  .object({
    firstName: z.string().min(1, 'First name is required').trim(),
    lastName: z.string().min(1, 'Last name is required').trim(),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must include a letter')
      .regex(/[0-9]/, 'Password must include a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password')
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

const step2Schema = z.object({
  companyName: z.string().optional(),
  companyDetails: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: 'You must accept the Terms and Privacy Policy'
  }),
  marketingOptIn: z.boolean().optional()
});

const perks = [
  {
    icon: BadgeCheck,
    title: 'Free to register',
    text: 'No setup fees, no hidden costs.'
  },
  {
    icon: Package,
    title: 'Order tracking',
    text: 'Real-time visibility on every shipment.'
  },
  {
    icon: Truck,
    title: 'Global reach',
    text: 'Import & export logistics, worldwide.'
  }
];

// ─── Step Indicator ────────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep }) => {
  const steps = [
    { label: 'Account', icon: User },
    { label: 'Details', icon: MapPin },
    { label: 'Done', icon: CheckCircle2 }
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;

        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                    : isActive
                    ? 'bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-600/30 ring-4 ring-teal-500/15 scale-110'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isCompleted ? <Check size={17} strokeWidth={3} /> : <StepIcon size={16} />}
              </div>
              <span
                className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${
                  isActive ? 'text-teal-600' : isCompleted ? 'text-teal-500' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="relative h-1 w-14 lg:w-20 mb-5 mx-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 ${
                    currentStep > stepNum ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const CustomerRegister = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useContext(CustomerAuthContext);
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const handleGoogleCredential = useCallback(
    async (credential) => {
      try {
        setGoogleSubmitting(true);
        await loginWithGoogle(credential);
        toast.success('Welcome! Your account is ready.');
        navigate('/customer/profile', { replace: true });
      } catch (err) {
        toast.error(err.message || 'Google sign-in failed.');
      } finally {
        setGoogleSubmitting(false);
      }
    },
    [loginWithGoogle, navigate]
  );

  // Step 1 form
  const {
    register: reg1,
    handleSubmit: handle1,
    formState: { errors: err1 }
  } = useForm({ resolver: zodResolver(step1Schema), mode: 'onBlur' });

  // Step 2 form
  const {
    register: reg2,
    handleSubmit: handle2,
    formState: { errors: err2 }
  } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: { acceptTerms: false, marketingOptIn: false }
  });

  const onStep1Submit = (data) => {
    setStep1Data(data);
    setStep(2);
  };

  const onStep2Submit = async (data) => {
    try {
      setSubmitting(true);
      const payload = {
        firstName: step1Data.firstName,
        lastName: step1Data.lastName,
        email: step1Data.email,
        phone: step1Data.phone,
        password: step1Data.password,
        companyName: data.companyName,
        companyDetails: data.companyDetails,
        shippingAddress: {
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country
        },
        acceptTerms: true,
        marketingOptIn: Boolean(data.marketingOptIn)
      };
      await customerAuthService.register(payload);
      toast.success('Account created! Please verify your email.');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-slate-950 px-4 py-10 overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 auth-grid-overlay" />
      <div className="absolute -top-40 -right-40 w-[34rem] h-[34rem] bg-teal-500/20 rounded-full blur-[120px] animate-auth-blob" />
      <div className="absolute -bottom-48 -left-32 w-[30rem] h-[30rem] bg-emerald-500/15 rounded-full blur-[120px] animate-auth-blob-slow" />
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] animate-auth-blob" />

      <div className="relative w-full max-w-5xl animate-auth-fade-up">
        {/* Gradient border wrapper */}
        <div className="rounded-3xl p-[1px] bg-gradient-to-br from-teal-400/40 via-slate-700/40 to-emerald-400/30 shadow-2xl shadow-black/40">
          <div className="rounded-3xl bg-white overflow-hidden flex flex-col md:flex-row">

            {/* ── Left Brand Panel ── */}
            <div className="md:w-[42%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white p-8 lg:p-10 flex flex-col justify-between">
              <div className="absolute inset-0 auth-grid-overlay opacity-60" />
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl animate-auth-blob" />
              <div className="absolute -bottom-20 -left-16 w-64 h-64 bg-emerald-400/15 rounded-full blur-3xl animate-auth-blob-slow" />

              {/* Logo */}
              <div className="flex items-center gap-3 relative z-10">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 font-extrabold text-xl shadow-lg shadow-teal-500/40">
                  R
                </div>
                <div>
                  <p className="text-lg font-extrabold tracking-wider leading-none">RIPOMA</p>
                  <span className="text-[10px] text-teal-300 font-bold tracking-[0.3em] uppercase">Global</span>
                </div>
              </div>

              {/* Center content */}
              <div className="my-10 md:my-0 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-300 text-[11px] font-bold uppercase tracking-widest mb-5">
                  <Sparkles size={12} />
                  Get Started
                </div>
                <h2 className="text-3xl lg:text-[2.1rem] font-extrabold leading-tight">
                  Join{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">
                    RIPOMA GLOBAL
                  </span>
                </h2>
                <p className="text-slate-400 text-sm mt-4 leading-relaxed max-w-xs">
                  Create your account in minutes and unlock the full suite of order management and logistics tools.
                </p>

                <div className="mt-8 space-y-3">
                  {perks.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="flex items-start gap-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm px-4 py-3 animate-auth-float"
                        style={{ animationDelay: `${i * 0.7}s` }}
                      >
                        <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-400/25 flex items-center justify-center shrink-0">
                          <Icon size={16} className="text-teal-300" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white leading-tight">{item.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-500">
                <span>© {new Date().getFullYear()} RIPOMA GLOBAL Inc.</span>
                <span className="inline-flex items-center gap-1 text-teal-400/80">
                  <ShieldCheck size={12} />
                  256-bit encrypted
                </span>
              </div>
            </div>

            {/* ── Right Form Panel ── */}
            <div className="md:w-[58%] p-8 lg:p-12 flex flex-col justify-center bg-white">
              <div className="w-full max-w-lg mx-auto">
                <StepIndicator currentStep={step} />

                {/* ── Step 1: Account Info ── */}
                {step === 1 && (
                  <div className="animate-auth-fade-up">
                    <div className="mb-6">
                      <h3 className="text-2xl font-extrabold text-slate-900">Create your account</h3>
                      <p className="text-slate-500 text-sm mt-1.5">Fill in your personal details to get started.</p>
                    </div>

                    <div className="mb-5">
                      <GoogleSignInButton
                        onCredential={handleGoogleCredential}
                        disabled={submitting || googleSubmitting}
                        text="signup_with"
                      />
                    </div>

                    <div className="relative mb-5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-[11px]">
                        <span className="bg-white px-3 text-slate-400 font-bold uppercase tracking-widest">
                          or register with email
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handle1(onStep1Submit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                          <label className="auth-label">First Name</label>
                          <input id="reg-firstname" type="text" className={`auth-input ${err1.firstName ? 'border-rose-400' : ''}`} placeholder="John" {...reg1('firstName')} />
                          {err1.firstName && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{err1.firstName.message}</p>}
                        </div>

                        <div className="group">
                          <label className="auth-label">Last Name</label>
                          <input id="reg-lastname" type="text" className={`auth-input ${err1.lastName ? 'border-rose-400' : ''}`} placeholder="Doe" {...reg1('lastName')} />
                          {err1.lastName && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{err1.lastName.message}</p>}
                        </div>
                      </div>

                      <div className="group">
                        <label className="auth-label">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail size={12} className="text-teal-500" />
                            Email Address
                          </span>
                        </label>
                        <input id="reg-email" type="email" className={`auth-input ${err1.email ? 'border-rose-400' : ''}`} placeholder="you@example.com" {...reg1('email')} />
                        {err1.email && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{err1.email.message}</p>}
                      </div>

                      <div className="group">
                        <label className="auth-label">Phone Number <span className="text-slate-400 font-medium normal-case tracking-normal">(optional)</span></label>
                        <input id="reg-phone" type="tel" className="auth-input" placeholder="+1 (555) 000-0000" {...reg1('phone')} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                          <label className="auth-label">
                            <span className="inline-flex items-center gap-1.5">
                              <Lock size={12} className="text-teal-500" />
                              Password
                            </span>
                          </label>
                          <div className="relative">
                            <input id="reg-password" type={showPassword ? 'text' : 'password'} className={`auth-input pr-9 ${err1.password ? 'border-rose-400' : ''}`} placeholder="Min. 8 characters" {...reg1('password')} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors">
                              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {err1.password && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{err1.password.message}</p>}
                        </div>

                        <div className="group">
                          <label className="auth-label">
                            <span className="inline-flex items-center gap-1.5">
                              <Lock size={12} className="text-teal-500" />
                              Confirm Password
                            </span>
                          </label>
                          <div className="relative">
                            <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} className={`auth-input pr-9 ${err1.confirmPassword ? 'border-rose-400' : ''}`} placeholder="Repeat password" {...reg1('confirmPassword')} />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors">
                              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {err1.confirmPassword && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{err1.confirmPassword.message}</p>}
                        </div>
                      </div>

                      <button id="reg-next-step" type="submit" className="auth-btn-primary mt-2">
                        <span>Continue</span>
                        <ArrowRight size={16} />
                      </button>
                    </form>

                    <p className="text-sm text-slate-500 text-center mt-5">
                      Already have an account?{' '}
                      <Link to="/customer/login" className="font-bold text-teal-600 hover:text-teal-700 transition-colors">
                        Sign in
                      </Link>
                    </p>
                  </div>
                )}

                {/* ── Step 2: Address & Company ── */}
                {step === 2 && (
                  <div className="animate-auth-fade-up">
                    <div className="mb-6">
                      <h3 className="text-2xl font-extrabold text-slate-900">Address & company</h3>
                      <p className="text-slate-500 text-sm mt-1.5">Optional — you can update these later in your profile.</p>
                    </div>

                    <form onSubmit={handle2(onStep2Submit)} className="space-y-4">
                      <div className="group">
                        <label className="auth-label">Company Name <span className="text-slate-400 font-medium normal-case tracking-normal">(optional)</span></label>
                        <input id="reg-company" type="text" className="auth-input" placeholder="Acme Corp Ltd." {...reg2('companyName')} />
                      </div>

                      <div className="group">
                        <label className="auth-label">Company Details <span className="text-slate-400 font-medium normal-case tracking-normal">(optional)</span></label>
                        <textarea id="reg-company-details" className="auth-input" rows={2} placeholder="Brief description of your business..." {...reg2('companyDetails')} />
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                            <MapPin size={12} className="text-teal-600" />
                          </span>
                          Shipping Address
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className="auth-label">Street Address</label>
                            <input id="reg-street" type="text" className="auth-input bg-white" placeholder="123 Commerce St." {...reg2('street')} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="auth-label">City</label>
                              <input id="reg-city" type="text" className="auth-input bg-white" placeholder="New York" {...reg2('city')} />
                            </div>
                            <div>
                              <label className="auth-label">State / Region</label>
                              <input id="reg-state" type="text" className="auth-input bg-white" placeholder="NY" {...reg2('state')} />
                            </div>
                            <div>
                              <label className="auth-label">Postal Code</label>
                              <input id="reg-postal" type="text" className="auth-input bg-white" placeholder="10001" {...reg2('postalCode')} />
                            </div>
                            <div className="group">
                              <label className="auth-label">Country</label>
                              <input id="reg-country" type="text" className="auth-input bg-white" placeholder="United States" {...reg2('country')} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-start gap-2.5 text-sm text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            {...reg2('acceptTerms')}
                          />
                          <span>
                            I agree to the{' '}
                            <Link to="/customer/terms" className="font-bold text-teal-600 hover:underline" target="_blank">
                              Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link to="/customer/privacy" className="font-bold text-teal-600 hover:underline" target="_blank">
                              Privacy Policy
                            </Link>
                            .
                          </span>
                        </label>
                        {err2.acceptTerms && (
                          <p className="text-rose-500 text-xs font-semibold">{err2.acceptTerms.message}</p>
                        )}
                        <label className="flex items-start gap-2.5 text-sm text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            {...reg2('marketingOptIn')}
                          />
                          <span>Send me occasional product updates and offers (optional).</span>
                        </label>
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        >
                          <ArrowLeft size={16} />
                          <span>Back</span>
                        </button>
                        <button
                          id="reg-submit"
                          type="submit"
                          disabled={submitting}
                          className="auth-btn-primary flex-[2]"
                        >
                          {submitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>Create Account</span>
                              <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ── Step 3: Success ── */}
                {step === 3 && (
                  <div className="text-center space-y-6 py-4 animate-auth-fade-up">
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 bg-teal-400/20 rounded-full blur-xl animate-auth-blob" />
                      <div className="relative w-24 h-24 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-full flex items-center justify-center border-2 border-teal-100 shadow-lg shadow-teal-500/10">
                        <MailCheck className="w-11 h-11 text-teal-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900">You're almost there!</h3>
                      <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                        Your account has been created successfully. We've sent a verification email — please click the link inside to activate your account.
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 text-left max-w-sm mx-auto">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">⚡ Developer Mode</p>
                      <p className="text-xs text-amber-600">Check the server console for the verification link (email delivery is mocked in development).</p>
                    </div>
                    <div className="max-w-xs mx-auto">
                      <Link to="/customer/login" className="auth-btn-primary">
                        <span>Go to Login</span>
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerRegister;
