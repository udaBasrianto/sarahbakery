import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "@/integrations/api/client";
import { SEO } from "@/components/SEO";
import { HeaderNav } from "@/components/HeaderNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  ChefHat, 
  Sparkles, 
  Clock, 
  Utensils, 
  Lightbulb, 
  Image as ImageIcon,
  Save,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface IngredientItem {
  amount: string;
  unit: string;
  name: string;
}

interface StepItem {
  step_number: number;
  instruction: string;
}

export default function CreateRecipePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [category, setCategory] = useState("Bolu & Cake");
  const [prepTime, setPrepTime] = useState("20");
  const [cookTime, setCookTime] = useState("35");
  const [servings, setServings] = useState("8 potong");
  const [difficulty, setDifficulty] = useState("Mudah");
  const [tips, setTips] = useState("");

  const [ingredients, setIngredients] = useState<IngredientItem[]>([
    { amount: "200", unit: "gram", name: "Tepung Terigu" },
    { amount: "4", unit: "butir", name: "Telur Ayam" },
    { amount: "150", unit: "gram", name: "Gula Pasir" },
  ]);

  const [steps, setSteps] = useState<StepItem[]>([
    { step_number: 1, instruction: "Kocok telur dan gula hingga mengembang kental berjejak." },
    { step_number: 2, instruction: "Ayak tepung terigu, masukkan bertahap ke dalam adonan lalu aduk perlahan." },
    { step_number: 3, instruction: "Tuang adonan ke loyang yang dialasi kertas roti, panggang hingga matang." },
  ]);

  // Auth guard
  useEffect(() => {
    apiClient.auth.getUser().then(({ data }) => {
      const u = (data as any)?.user || data;
      if (!u) {
        toast.error("Silakan login terlebih dahulu untuk membuat resep");
        navigate("/auth");
      } else {
        setCurrentUser(u);
      }
    });
  }, [navigate]);

  // Ingredient helpers
  const handleAddIngredient = () => {
    setIngredients((prev) => [...prev, { amount: "", unit: "gram", name: "" }]);
  };

  const handleUpdateIngredient = (index: number, field: keyof IngredientItem, value: string) => {
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length <= 1) {
      toast.error("Minimal harus ada 1 bahan masakan");
      return;
    }
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Step helpers
  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      { step_number: prev.length + 1, instruction: "" },
    ]);
  };

  const handleUpdateStep = (index: number, instruction: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, instruction } : s))
    );
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      toast.error("Minimal harus ada 1 langkah pembuatan");
      return;
    }
    const filtered = steps.filter((_, i) => i !== index);
    const renumbered = filtered.map((s, i) => ({ ...s, step_number: i + 1 }));
    setSteps(renumbered);
  };

  const generateSlug = (text: string) => {
    const clean = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return `${clean}-${Date.now().toString().slice(-4)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul resep wajib diisi");
      return;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim() !== "");
    if (validIngredients.length === 0) {
      toast.error("Mohon isi minimal 1 bahan resep");
      return;
    }

    const validSteps = steps.filter((st) => st.instruction.trim() !== "");
    if (validSteps.length === 0) {
      toast.error("Mohon isi minimal 1 langkah pembuatan");
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = generateSlug(title);
      const authorName = currentUser?.full_name || currentUser?.name || currentUser?.email?.split("@")[0] || "Baker Sarah";
      const authorAvatar = currentUser?.avatar_url || null;

      const payload = {
        user_id: currentUser.id,
        user_name: authorName,
        user_avatar: authorAvatar,
        title: title.trim(),
        slug,
        description: description.trim() || null,
        cover_image: coverImage.trim() || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800",
        category,
        prep_time_minutes: parseInt(prepTime, 10) || 20,
        cook_time_minutes: parseInt(cookTime, 10) || 35,
        servings: servings.trim() || "6-8 potong",
        difficulty,
        ingredients: JSON.stringify(validIngredients),
        steps: JSON.stringify(validSteps),
        tips: tips.trim() || null,
        likes_count: 1,
        views_count: 1,
        is_curated_by_admin: false,
        is_published: true,
      };

      const { data, error } = await apiClient.from("community_recipes").insert(payload);
      if (error) throw error;

      toast.success("Resep Anda berhasil dibagikan ke komunitas! 🎉");
      navigate(`/community/${slug}`);
    } catch (err: any) {
      console.error("Error creating recipe:", err);
      toast.error(err.message || "Gagal menyimpan resep");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <SEO
        title="Tulis & Bagikan Resep Kue - Sarah Bakery"
        description="Bagikan resep kreasi bolu, roti, kue kering, dan tips baking Anda kepada ribuan anggota komunitas Sarah Bakery."
      />

      <HeaderNav />

      <main className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <Link
            to="/community"
            className="p-2 rounded-xl bg-card border border-border/80 text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-primary" />
              Bagikan Resep Kreasi Anda
            </h1>
            <p className="text-xs text-muted-foreground">
              Tuliskan takaran bahan dan langkah pembuatan dengan rapi agar mudah diikuti pembaca.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Informasi Utama Resep */}
          <Card className="rounded-3xl shadow-soft border-border/80 overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Utensils className="w-4 h-4 text-primary" />
                Informasi Utama Resep
              </CardTitle>
              <CardDescription>
                Nama resep, kategori, foto hasil baking, dan waktu memasak
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label className="font-semibold text-sm">Judul Resep <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="Contoh: Bolu Gulung Keju Lembut Tanpa Spatula"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-2xl mt-1.5"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="font-semibold text-sm">Kategori Kue / Roti</Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-card border border-border rounded-2xl px-3 py-2 text-sm mt-1.5 focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="Bolu & Cake">Bolu &amp; Cake</option>
                    <option value="Roti & Donat">Roti &amp; Donat</option>
                    <option value="Cookies & Brownies">Cookies &amp; Brownies</option>
                    <option value="Pastry & Pie">Pastry &amp; Pie</option>
                    <option value="Dessert & Puding">Dessert &amp; Puding</option>
                    <option value="Jajanan Pasar">Jajanan Pasar</option>
                  </select>
                </div>

                <div>
                  <Label className="font-semibold text-sm">Tingkat Kesulitan</Label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-card border border-border rounded-2xl px-3 py-2 text-sm mt-1.5 focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="Mudah">Mudah (Pemula)</option>
                    <option value="Sedang">Sedang (Menengah)</option>
                    <option value="Mahir">Mahir (Berpengalaman)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="font-semibold text-sm">Deskripsi / Kisah di Balik Resep</Label>
                <Textarea
                  placeholder="Ceritakan sedikit tentang cita rasa, tekstur, atau momen spesial saat membuat resep ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="rounded-2xl mt-1.5"
                />
              </div>

              <div>
                <Label className="font-semibold text-sm flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  URL Foto Cover Hasil Baking
                </Label>
                <Input
                  placeholder="https://images.unsplash.com/photo-..."
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="rounded-2xl mt-1.5"
                />
                {coverImage && (
                  <div className="mt-3 aspect-[16/9] w-full max-w-sm rounded-2xl overflow-hidden border border-border">
                    <img src={coverImage} alt="Pratinjau Foto" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="grid gap-3 grid-cols-3 pt-2">
                <div>
                  <Label className="font-semibold text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Waktu Siap
                  </Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      className="rounded-xl text-center"
                    />
                    <span className="text-xs text-muted-foreground">mnt</span>
                  </div>
                </div>

                <div>
                  <Label className="font-semibold text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Waktu Panggang
                  </Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value)}
                      className="rounded-xl text-center"
                    />
                    <span className="text-xs text-muted-foreground">mnt</span>
                  </div>
                </div>

                <div>
                  <Label className="font-semibold text-xs text-muted-foreground">Porsi / Hasil</Label>
                  <Input
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="8 potong"
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Bahan-Bahan Masakan */}
          <Card className="rounded-3xl shadow-soft border-border/80 overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Daftar Bahan-Bahan
                </CardTitle>
                <CardDescription>
                  Masukkan takaran, satuan (gram, ml, butir, sdt), dan nama bahan
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddIngredient}
                className="rounded-xl font-semibold gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Bahan
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2 rounded-2xl border border-border/60">
                  <Input
                    placeholder="Jumlah (e.g. 200)"
                    value={ing.amount}
                    onChange={(e) => handleUpdateIngredient(idx, "amount", e.target.value)}
                    className="w-24 rounded-xl text-center bg-card"
                  />
                  <Input
                    placeholder="Satuan (gram, ml)"
                    value={ing.unit}
                    onChange={(e) => handleUpdateIngredient(idx, "unit", e.target.value)}
                    className="w-24 rounded-xl text-center bg-card"
                  />
                  <Input
                    placeholder="Nama bahan (e.g. Tepung Terigu)"
                    value={ing.name}
                    onChange={(e) => handleUpdateIngredient(idx, "name", e.target.value)}
                    className="flex-1 rounded-xl bg-card"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="text-muted-foreground hover:text-rose-500 rounded-xl shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 3: Langkah-Langkah Pembuatan */}
          <Card className="rounded-3xl shadow-soft border-border/80 overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-primary" />
                  Langkah-Langkah Pembuatan
                </CardTitle>
                <CardDescription>
                  Tuliskan instruksi langkah demi langkah secara runtut
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStep}
                className="rounded-xl font-semibold gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Langkah
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {steps.map((st, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-muted/20 p-3 rounded-2xl border border-border/60">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 mt-1 shadow-sm">
                    {st.step_number}
                  </div>
                  <Textarea
                    placeholder={`Jelaskan instruksi untuk langkah ${st.step_number}...`}
                    value={st.instruction}
                    onChange={(e) => handleUpdateStep(idx, e.target.value)}
                    rows={2}
                    className="flex-1 rounded-xl bg-card"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStep(idx)}
                    className="text-muted-foreground hover:text-rose-500 rounded-xl shrink-0 mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 4: Tips Rahasia Baking */}
          <Card className="rounded-3xl shadow-soft border-border/80 overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Tips &amp; Rahasia Sukses Baking (Opsional)
              </CardTitle>
              <CardDescription>
                Trik penting agar kue tidak kempes, suhu oven pas, atau cara penyimpanan
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                placeholder="Contoh: Pastikan putih telur bebas dari minyak agar bisa kaku mengembang sempurna..."
                value={tips}
                onChange={(e) => setTips(e.target.value)}
                rows={3}
                className="rounded-2xl"
              />
            </CardContent>
          </Card>

          {/* Submit Button Action */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl h-12 text-base font-bold shadow-lg gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menerbitkan Resep...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Bagikan Resep ke Komunitas
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/community")}
              className="rounded-2xl h-12 px-6"
            >
              Batal
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
