'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Loader2,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SaleLogForm {
  tokenCode: string;
  customerName: string;
  customerPhone: string;
  product: string;
  amount: string;
  notes: string;
}

interface ArticleOption {
  id: string;
  name: string;
  price: number;
  code: string;
}

type GenericRow = Record<string, any>;

export default function ProspectorLogForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SaleLogForm>();

  const selectedProduct = watch('product');

  /*
   * Chargement des articles disponibles.
   */
  useEffect(() => {
    let mounted = true;

    const loadArticles = async () => {
      try {
        setLoadingArticles(true);

        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setLoadingArticles(false);
          }
          return;
        }

        /*
         * Organisation du prospecteur connecté.
         */
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id, role, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        const organizationId =
          membership?.organization_id;

        if (!organizationId) {
          if (mounted) {
            setLoadingArticles(false);
          }
          return;
        }

        /*
         * Récupération des articles de l'organisation.
         *
         * select('*') permet de ne pas dépendre des anciennes
         * colonnes nom_article / prix_total / code_article.
         */
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq(
            'organization_id',
            organizationId
          )
          .order('created_at', {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        const rows: GenericRow[] = data ?? [];

        /*
         * Vérification du stock actuel.
         *
         * Les stocks sont maintenant gérés dans la table stocks.
         */
        const { data: stockRows } = await supabase
          .from('stocks')
          .select('*')
          .eq(
            'organization_id',
            organizationId
          );

        const stockMap = new Map<string, number>();

        (stockRows ?? []).forEach(
          (stock: GenericRow) => {
            const articleId =
              stock.article_id ??
              stock.article ??
              stock.product_id;

            if (!articleId) return;

            const quantity = Number(
              stock.remaining_quantity ??
                stock.current_quantity ??
                stock.quantity ??
                stock.stock ??
                stock.total_quantity ??
                0
            );

            stockMap.set(
              String(articleId),
              quantity
            );
          }
        );

        const mappedArticles: ArticleOption[] =
          rows
            .map((article) => {
              const id = article.id;

              const name =
                article.name ??
                article.nom ??
                article.article_name ??
                article.title ??
                article.nom_article ??
                'Article';

              const price = Number(
                article.price ??
                  article.sale_price ??
                  article.fixed_price ??
                  article.unit_price ??
                  article.prix ??
                  article.prix_total ??
                  0
              );

              const code =
                article.code ??
                article.article_code ??
                article.reference ??
                article.sku ??
                article.code_article ??
                '—';

              const stock =
                stockMap.get(String(id));

              return {
                id,
                name,
                price,
                code,
                stock,
              };
            })
            .filter((article) => {
              /*
               * Si un stock correspondant existe,
               * seuls les articles disponibles sont affichés.
               *
               * Si aucun enregistrement de stock n'existe encore,
               * l'article reste disponible afin de ne pas bloquer
               * le module terrain pendant la reconstruction.
               */
              const stock = (article as any).stock;

              if (stock === undefined) {
                return true;
              }

              return stock > 0;
            })
            .map((article) => {
              const clean = {
                id: article.id,
                name: article.name,
                price: article.price,
                code: article.code,
              };

              return clean;
            });

        if (mounted) {
          setArticles(mappedArticles);
        }
      } catch (error) {
        console.error(
          'Erreur chargement articles:',
          error
        );

        if (mounted) {
          setArticles([]);
        }
      } finally {
        if (mounted) {
          setLoadingArticles(false);
        }
      }
    };

    loadArticles();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Remplissage automatique du montant lorsque
   * l'article est sélectionné.
   */
  useEffect(() => {
    if (!selectedProduct) return;

    const article = articles.find(
      (item) => item.id === selectedProduct
    );

    if (article) {
      setValue(
        'amount',
        String(article.price)
      );
    }
  }, [
    selectedProduct,
    articles,
    setValue,
  ]);

  /*
   * Enregistrement de la vente.
   */
  const onSubmit = async (
    formData: SaleLogForm
  ) => {
    setIsSubmitting(true);
    setSubmitError('');
    setIsSuccess(false);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          'Votre session a expiré. Veuillez vous reconnecter.'
        );
      }

      /*
       * Organisation du prospecteur.
       */
      const { data: membership, error: memberError } =
        await supabase
          .from('organization_members')
          .select(
            'organization_id, role, status'
          )
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

      if (memberError) {
        throw memberError;
      }

      if (!membership?.organization_id) {
        throw new Error(
          'Aucune organisation active associée à votre compte.'
        );
      }

      const organizationId =
        membership.organization_id;

      /*
       * Prospecteur connecté.
       */
      let prospector: GenericRow | null = null;

      const { data: prospectorByUser } =
        await supabase
          .from('prospecteurs')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

      prospector = prospectorByUser;

      /*
       * Compatibilité avec les variantes possibles
       * de rattachement du prospecteur.
       */
      if (!prospector) {
        for (const column of [
          'profile_id',
          'agent_id',
          'account_id',
        ]) {
          const { data } = await supabase
            .from('prospecteurs')
            .select('*')
            .eq(column, user.id)
            .maybeSingle();

          if (data) {
            prospector = data;
            break;
          }
        }
      }

      const prospectorId =
        prospector?.id ?? null;

      /*
       * Article sélectionné.
       */
      const article = articles.find(
        (item) => item.id === formData.product
      );

      if (!article) {
        throw new Error(
          'Veuillez sélectionner un article valide.'
        );
      }

      const amount = Number(
        formData.amount
      );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw new Error(
          'Le montant encaissé est invalide.'
        );
      }

      /*
       * ---------------------------------------------------------
       * CLIENT
       * ---------------------------------------------------------
       *
       * On recherche d'abord un client existant par téléphone.
       */
      let clientId: string | null = null;

      if (formData.customerPhone.trim()) {
        const { data: existingClient } =
          await supabase
            .from('clients')
            .select('*')
            .eq(
              'organization_id',
              organizationId
            )
            .eq(
              'phone',
              formData.customerPhone.trim()
            )
            .maybeSingle();

        if (existingClient?.id) {
          clientId = existingClient.id;
        }
      }

      /*
       * Création du client s'il n'existe pas.
       *
       * Plusieurs noms de colonnes sont préparés pour les
       * structures possibles de la table actuelle.
       */
      if (!clientId) {
        const clientPayload: GenericRow = {
          organization_id: organizationId,
          name: formData.customerName.trim(),
          phone:
            formData.customerPhone.trim() ||
            null,
        };

        const { data: newClient, error: clientError } =
          await supabase
            .from('clients')
            .insert(clientPayload)
            .select('*')
            .single();

        if (clientError) {
          throw clientError;
        }

        clientId = newClient?.id ?? null;
      }

      /*
       * ---------------------------------------------------------
       * VENTE
       * ---------------------------------------------------------
       */
      const salePayload: GenericRow = {
        organization_id: organizationId,
        client_id: clientId,
        article_id: article.id,
        amount,
        notes:
          formData.notes.trim() ||
          null,
        token_code:
          formData.tokenCode.trim().toUpperCase(),
        created_by: user.id,
      };

      if (prospectorId) {
        salePayload.prospecteur_id =
          prospectorId;
      }

      const { error: saleError } =
        await supabase
          .from('sales')
          .insert(salePayload);

      if (saleError) {
        /*
         * Si la structure utilise seller_id ou agent_id
         * plutôt que prospecteur_id, on tente une seconde
         * écriture sans l'identifiant prospecteur.
         *
         * L'erreur finale reste celle de Supabase si * l'insertion est réellement impossible.
         */
        const fallbackPayload = {
          organization_id: organizationId,
          client_id: clientId,
          article_id: article.id,
          amount,
          notes:
            formData.notes.trim() ||
            null,
          token_code:
            formData.tokenCode
              .trim()
              .toUpperCase(),
          created_by: user.id,
        };

        const { error: fallbackError } =
          await supabase
            .from('sales')
            .insert(fallbackPayload);

        if (fallbackError) {
          throw fallbackError;
        }
      }

      /*
       * Succès.
       */
      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        reset();
      }, 2000);
    } catch (error: any) {
      console.error(
        'Erreur enregistrement vente:',
        error
      );

      setSubmitError(
        error?.message ||
          'Échec de l’enregistrement. Veuillez réessayer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl card-glow overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center">
          <PlusCircle
            size={16}
            className="text-primary"
          />
        </div>

        <div>
          <h3 className="text-sm font-600 text-foreground">
            Enregistrer une Vente
          </h3>

          <p className="text-xs text-muted-foreground">
            Saisir le code token et les informations client
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="p-4 space-y-3"
      >
        {/* TOKEN */}
        <div>
          <label className="block text-xs font-600 text-foreground mb-1.5">
            Code Token{' '}
            <span className="text-danger">
              *
            </span>
          </label>

          <p className="text-xs text-muted-foreground mb-1.5">
            Scanner ou saisir le token imprimé sur la carte de vente
          </p>

          <input
            {...register('tokenCode', {
              required:
                'Le code token est obligatoire',
            })}
            className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm font-mono-data text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 uppercase"
            placeholder="TKN-0000-A"
          />

          {errors.tokenCode && (
            <p className="text-xs text-danger mt-1">
              {errors.tokenCode.message}
            </p>
          )}
        </div>

        {/* CLIENT */}
        <div>
          <label className="block text-xs font-600 text-foreground mb-1.5">
            Nom du Client{' '}
            <span className="text-danger">
              *
            </span>
          </label>

          <input
            {...register('customerName', {
              required:
                'Le nom du client est obligatoire',
            })}
            className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150"
            placeholder="Nom complet de l'acheteur"
          />

          {errors.customerName && (
            <p className="text-xs text-danger mt-1">
              {errors.customerName.message}
            </p>
          )}
        </div>

        {/* TELEPHONE */}
        <div>
          <label className="block text-xs font-600 text-foreground mb-1.5">
            Téléphone Client
          </label>

          <input
            {...register('customerPhone')}
            type="tel"
            className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150"
            placeholder="+229 97 00 00 00"
          />
        </div>

        {/* PRODUIT */}
        <div>
          <label className="block text-xs font-600 text-foreground mb-1.5">
            Produit{' '}
            <span className="text-danger">
              *
            </span>
          </label>

          <select
            {...register('product', {
              required:
                'Sélectionnez un produit',
            })}
            className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150"
            disabled={loadingArticles}
          >
            <option value="">
              {loadingArticles
                ? 'Chargement des produits…' :'Sélectionner le produit vendu'}
            </option>

            {articles.map((article) => (
              <option
                key={article.id}
                value={article.id}
              >
                {article.name} —{' '}
                {Number(
                  article.price
                ).toLocaleString(
                  'fr-FR'
                )}{' '}
                FCFA
              </option>
            ))}

            {!loadingArticles &&
              articles.length === 0 && (
                <option
                  value=""
                  disabled
                >
                  Aucun produit disponible
                </option>
              )}
          </select>

          {errors.product && (
            <p className="text-xs text-danger mt-1">
              {errors.product.message}
            </p>
          )}
        </div>

        {/* MONTANT */}
        <div>
          <label className="block text-xs font-600 text-foreground mb-1.5">
            Montant Encaissé{' '}
            <span className="text-danger">
              *
            </span>
          </label>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono-data">
              FCFA
            </span>

            <input
              {...register('amount', {
                required:
                  'Le montant est obligatoire',
                pattern: {
                  value:
                    /^\d+(\.\d{1,2})?$/,
                  message:
                    'Saisir un montant valide',
                },
              })}
              type="text"
              className="w-full bg-input border border-border rounded-md pl-14 pr-3 py-2.5 text-sm font-mono-data text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150"
              placeholder="0"
            />
          </div>

          {errors.amount && (
            <p className="text-xs text-danger mt-1">
              {errors.amount.message}
            </p>
          )}
        </div>

        {/* NOTES */}
        <div>
          <label className="block text-xs font-600 text-foreground mb-1.5">
            Notes
          </label>

          <textarea
            {...register('notes')}
            rows={2}
            className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 resize-none"
            placeholder="Optionnel — lieu, conditions particulières…"
          />
        </div>

        {/* ERREUR */}
        {submitError && (
          <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-md px-3 py-2">
            {submitError}
          </p>
        )}

        {/* BOUTON */}
        <button
          type="submit"
          disabled={
            isSubmitting ||
            isSuccess ||
            loadingArticles
          }
          className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-sm font-600 gold-gradient-bg text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2
                size={16}
                className="animate-spin"
              />
              Enregistrement…
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 size={16} />
              Vente Enregistrée !
            </>
          ) : (
            <>
              <PlusCircle size={16} />
              Enregistrer cette Vente
            </>
          )}
        </button>
      </form>
    </div>
  );
}
