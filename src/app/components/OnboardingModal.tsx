'use client';

import React, { useState } from 'react';
import {
  X,
  Building2,
  User,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4;

interface FormData {
  companyName: string;
  country: string;
  city: string;
  address: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  subscriptionPlan: string;
}

interface Plan {
  code: string;
  name: string;
  price: number;
  currency: string;
  duration: string;
  description: string;
  popular?: boolean;
}

const steps = [
  {
    id: 1,
    label: 'Entreprise',
    icon: Building2,
  },
  {
    id: 2,
    label: 'Administrateur',
    icon: User,
  },
  {
    id: 3,
    label: 'Abonnement',
    icon: CreditCard,
  },
  {
    id: 4,
    label: 'Confirmation',
    icon: CheckCircle2,
  },
];

const PLANS: Plan[] = [
  {
    code: 'MONTHLY',
    name: 'Mensuel',
    price: 50,
    currency: 'USD',
    duration: '30 jours',
    description:
      'Formule flexible pour commencer avec JDV CRM.',
  },
  {
    code: 'QUARTERLY',
    name: 'Trimestriel',
    price: 150,
    currency: 'USD',
    duration: '90 jours',
    description:
      'Une formule adaptée aux entreprises qui souhaitent planifier leur activité.',
    popular: true,
  },
  {
    code: 'SEMESTER',
    name: 'Semestriel',
    price: 300,
    currency: 'USD',
    duration: '180 jours',
    description:
      'Pour un déploiement durable auprès de vos équipes.',
  },
  {
    code: 'ANNUAL',
    name: 'Annuel',
    price: 600,
    currency: 'USD',
    duration: '365 jours',
    description:
      'La formule complète pour une utilisation annuelle.',
  },
];

export default function OnboardingModal({
  isOpen,
  onClose,
}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<FormData>({
    defaultValues: {
      country: 'Bénin',
      subscriptionPlan: 'QUARTERLY',
    },
  });

  const watchedPlan = watch('subscriptionPlan');
  const watchedCompany = watch('companyName');
  const watchedAdminEmail = watch('adminEmail');
  const watchedAdminFirstName = watch('adminFirstName');
  const watchedAdminLastName = watch('adminLastName');

  if (!isOpen) {
    return null;
  }

  const selectedPlan =
    PLANS.find((plan) => plan.code === watchedPlan) ?? PLANS[1];

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = [
        'companyName',
        'country',
        'city',
      ];
    }

    if (currentStep === 2) {
      fieldsToValidate = [
        'adminFirstName',
        'adminLastName',
        'adminEmail',
        'adminPhone',
      ];
    }

    if (currentStep === 3) {
      fieldsToValidate = ['subscriptionPlan'];
    }

    const valid = await trigger(fieldsToValidate);

    if (valid && currentStep < 4) {
      setCurrentStep((previous) => (previous + 1) as Step);
      setSubmitError('');
    }
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setCurrentStep(1);
    setSubmitError('');
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: data.companyName.trim(),
          country: data.country,
          city: data.city.trim(),
          address: data.address.trim(),

          adminFirstName: data.adminFirstName.trim(),
          adminLastName: data.adminLastName.trim(),
          adminEmail: data.adminEmail.trim().toLowerCase(),
          adminPhone: data.adminPhone.trim(),

          planCode: data.subscriptionPlan,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ??
            "Impossible de créer votre inscription."
        );
      }

      if (result?.checkoutUrl) {
        toast.success(
          'Inscription enregistrée. Redirection vers le paiement...'
        );

        window.location.href = result.checkoutUrl;
        return;
      }

      if (result?.success) {
        toast.success(
          'Votre inscription a été enregistrée avec succès.'
        );

        handleClose();
        return;
      }

      throw new Error(
        "Le serveur n'a pas fourni de résultat valide."
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'inscription.";

      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl max-h-[90vh] bg-card border border-primary/20 rounded-xl shadow-modal animate-scale-in overflow-hidden flex flex-col">
        {/* Barre supérieure */}
        <div className="h-1 gold-gradient-bg flex-shrink-0" />

        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Inscrire votre entreprise
            </h2>

            <p className="text-xs text-muted-foreground mt-0.5">
              Étape {currentStep} sur 4 —{' '}
              {steps[currentStep - 1].label}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Fermer"
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Indicateurs d'étapes */}
        <div className="flex items-center px-6 py-4 border-b border-border gap-0 flex-shrink-0">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = step.id === currentStep;
            const isComplete = step.id < currentStep;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isComplete
                        ? 'gold-gradient-bg'
                        : isActive
                          ? 'border-2 border-primary bg-primary/10' :'border border-border bg-muted'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2
                        size={14}
                        className="text-primary-foreground"
                      />
                    ) : (
                      <StepIcon
                        size={14}
                        className={
                          isActive
                            ? 'text-primary' :'text-muted-foreground'
                        }
                      />
                    )}
                  </div>

                  <span
                    className={`text-xs font-medium ${
                      isActive
                        ? 'text-primary'
                        : isComplete
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 mb-4 transition-colors duration-300 ${
                      step.id < currentStep
                        ? 'bg-primary/50' :'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col min-h-0"
        >
          <div className="px-6 py-6 overflow-y-auto min-h-[320px]">
            {/* =====================================================
                ÉTAPE 1 — ENTREPRISE
            ====================================================== */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-slide-up">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Informations de votre entreprise
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1">
                    Ces informations permettront de créer votre espace
                    entreprise JDV CRM.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Nom de l&apos;entreprise{' '}
                    <span className="text-danger">*</span>
                  </label>

                  <input
                    {...register('companyName', {
                      required:
                        "Le nom de l'entreprise est requis",
                      minLength: {
                        value: 2,
                        message:
                          'Le nom doit contenir au moins 2 caractères',
                      },
                    })}
                    type="text"
                    autoComplete="organization"
                    className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Nom de votre entreprise"
                  />

                  {errors.companyName && (
                    <p className="text-xs text-danger mt-1">
                      {errors.companyName.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Pays{' '}
                      <span className="text-danger">*</span>
                    </label>

                    <select
                      {...register('country', {
                        required: 'Le pays est requis',
                      })}
                      className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    >
                      <option value="Bénin">Bénin</option>
                      <option value="Togo">Togo</option>
                      <option value="Côte d'Ivoire">
                        Côte d&apos;Ivoire
                      </option>
                      <option value="Sénégal">Sénégal</option>
                      <option value="Burkina Faso">
                        Burkina Faso
                      </option>
                      <option value="Mali">Mali</option>
                      <option value="Niger">Niger</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Cameroun">Cameroun</option>
                      <option value="Autre">Autre</option>
                    </select>

                    {errors.country && (
                      <p className="text-xs text-danger mt-1">
                        {errors.country.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Ville{' '}
                      <span className="text-danger">*</span>
                    </label>

                    <input
                      {...register('city', {
                        required: 'La ville est requise',
                      })}
                      type="text"
                      autoComplete="address-level2"
                      className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                      placeholder="Porto-Novo"
                    />

                    {errors.city && (
                      <p className="text-xs text-danger mt-1">
                        {errors.city.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Adresse
                  </label>

                  <input
                    {...register('address')}
                    type="text"
                    autoComplete="street-address"
                    className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Adresse de l'entreprise"
                  />
                </div>
              </div>
            )}

            {/* =====================================================
                ÉTAPE 2 — ADMINISTRATEUR
            ====================================================== */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-slide-up">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Administrateur de l&apos;entreprise
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1">
                    Cet administrateur sera le responsable principal
                    de l&apos;espace entreprise.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Prénom{' '}
                      <span className="text-danger">*</span>
                    </label>

                    <input
                      {...register('adminFirstName', {
                        required: 'Le prénom est requis',
                      })}
                      type="text"
                      autoComplete="given-name"
                      className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                      placeholder="Prénom"
                    />

                    {errors.adminFirstName && (
                      <p className="text-xs text-danger mt-1">
                        {errors.adminFirstName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Nom{' '}
                      <span className="text-danger">*</span>
                    </label>

                    <input
                      {...register('adminLastName', {
                        required: 'Le nom est requis',
                      })}
                      type="text"
                      autoComplete="family-name"
                      className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                      placeholder="Nom"
                    />

                    {errors.adminLastName && (
                      <p className="text-xs text-danger mt-1">
                        {errors.adminLastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email professionnel{' '}
                    <span className="text-danger">*</span>
                  </label>

                  <input
                    {...register('adminEmail', {
                      required: "L'email est requis",
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: 'Entrez une adresse email valide',
                      },
                    })}
                    type="email"
                    autoComplete="email"
                    className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="administrateur@entreprise.com"
                  />

                  {errors.adminEmail && (
                    <p className="text-xs text-danger mt-1">
                      {errors.adminEmail.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Téléphone{' '}
                    <span className="text-danger">*</span>
                  </label>

                  <input
                    {...register('adminPhone', {
                      required:
                        'Le numéro de téléphone est requis',
                      minLength: {
                        value: 8,
                        message:
                          'Entrez un numéro de téléphone valide',
                      },
                    })}
                    type="tel"
                    autoComplete="tel"
                    className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="+229 XX XX XX XX"
                  />

                  {errors.adminPhone && (
                    <p className="text-xs text-danger mt-1">
                      {errors.adminPhone.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* =====================================================
                ÉTAPE 3 — ABONNEMENT
            ====================================================== */}
            {currentStep === 3 && (
              <div className="space-y-3 animate-slide-up">
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-foreground">
                    Choisissez votre abonnement
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1">
                    Sélectionnez la durée d&apos;abonnement qui correspond
                    à votre entreprise.
                  </p>
                </div>

                {PLANS.map((plan) => (
                  <label
                    key={plan.code}
                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-150 ${
                      watchedPlan === plan.code
                        ? 'border-primary bg-primary/10' :'border-border hover:border-primary/40'
                    }`}
                  >
                    <input
                      {...register('subscriptionPlan', {
                        required:
                          'Sélectionnez un abonnement',
                      })}
                      type="radio"
                      value={plan.code}
                      className="accent-primary"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          {plan.name}
                        </span>

                        {plan.popular && (
                          <span className="text-xs px-2 py-0.5 rounded-full gold-gradient-bg text-primary-foreground font-semibold">
                            Populaire
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground mt-1">
                        {plan.description}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-primary font-mono-data">
                        {plan.price} {plan.currency}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {plan.duration}
                      </div>
                    </div>
                  </label>
                ))}

                {errors.subscriptionPlan && (
                  <p className="text-xs text-danger mt-1">
                    {errors.subscriptionPlan.message}
                  </p>
                )}

                <div className="flex items-start gap-2 mt-4 px-3 py-3 rounded-lg bg-muted/40 border border-border">
                  <CreditCard
                    size={14}
                    className="text-primary mt-0.5 flex-shrink-0"
                  />

                  <p className="text-xs text-muted-foreground">
                    Le paiement sera effectué via la page sécurisée
                    FedaPay. Les moyens de paiement disponibles
                    dépendent de votre pays et des options proposées
                    par FedaPay.
                  </p>
                </div>
              </div>
            )}

            {/* =====================================================
                ÉTAPE 4 — CONFIRMATION
            ====================================================== */}
            {currentStep === 4 && (
              <div className="animate-slide-up space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Vérifiez votre inscription
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1">
                    Vérifiez les informations avant de poursuivre.
                  </p>
                </div>

                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Entreprise
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        Entreprise
                      </span>

                      <span className="text-sm font-medium text-foreground text-right">
                        {watchedCompany || '—'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        Localisation
                      </span>

                      <span className="text-sm font-medium text-foreground text-right">
                        {watch('city') || '—'},{' '}
                        {watch('country') || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      Administrateur
                    </h4>

                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-xs text-muted-foreground">
                          Nom
                        </span>

                        <span className="text-sm font-medium text-foreground text-right">
                          {watchedAdminFirstName || '—'}{' '}
                          {watchedAdminLastName || ''}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <span className="text-xs text-muted-foreground">
                          Email
                        </span>

                        <span className="text-sm font-medium text-foreground text-right break-all">
                          {watchedAdminEmail || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      Abonnement
                    </h4>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {selectedPlan.name}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {selectedPlan.duration}
                        </div>
                      </div>

                      <div className="text-lg font-bold text-primary font-mono-data">
                        {selectedPlan.price}{' '}
                        {selectedPlan.currency}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard
                      size={14}
                      className="text-primary"
                    />

                    <span className="text-xs font-semibold text-primary">
                      Paiement sécurisé
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Après validation, votre inscription sera
                    enregistrée. Vous serez ensuite redirigé vers
                    FedaPay afin de procéder au paiement de votre
                    abonnement.
                  </p>
                </div>

                {submitError && (
                  <div className="flex items-start gap-2 bg-danger/10 border border-danger/20 rounded-lg p-3">
                    <AlertCircle
                      size={14}
                      className="text-danger mt-0.5 flex-shrink-0"
                    />

                    <p className="text-xs text-danger">
                      {submitError}
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground leading-relaxed">
                  En poursuivant, vous acceptez les conditions
                  d&apos;utilisation et la politique de confidentialité de
                  JDV CRM.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep(
                    (previous) => (previous - 1) as Step
                  );
                  setSubmitError('');
                } else {
                  handleClose();
                }
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-md border border-border hover:border-primary/30 transition-all duration-150 disabled:opacity-50"
            >
              {currentStep === 1 ? 'Annuler' : '← Retour'}
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-md gold-gradient-bg text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150"
              >
                Continuer
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-md gold-gradient-bg text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed min-w-[210px] justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                    Inscription...
                  </>
                ) : (
                  <>
                    <CreditCard size={14} />
                    Continuer vers le paiement
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
