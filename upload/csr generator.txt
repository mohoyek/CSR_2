import os
import subprocess
import sys
import zipfile
from datetime import datetime
from tkinter import *
from tkinter import ttk, messagebox, filedialog

OPENSSL_PATH = r"C:\OpenSSL\bin\openssl.exe"

class CSRGeneratorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("ابزار تولید و صحت‌سنجی CSR — GICA")
        self.root.geometry("700x640")
        self.root.resizable(False, False)
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

        # فونت
        self.font_normal = ("B Nazanin", 12)
        self.font_bold = ("B Nazanin", 12, "bold")
        self.font_small = ("B Nazanin", 10)
        try:
            test = Label(self.root, text="تست", font=self.font_normal)
            test.pack_forget()
        except:
            self.font_normal = ("Tahoma", 10)
            self.font_bold = ("Tahoma", 10, "bold")
            self.font_small = ("Tahoma", 9)

        self.setup_ui()
        self.generated = False
        self.user_type = "individual"  # پیش‌فرض

    def setup_ui(self):
        title = Label(self.root, text="🛠️ ابزار تولید و اعتبارسنجی CSR — GICA", 
                      font=self.font_bold, fg="#2c3e50")
        title.pack(pady=10)

        # تب‌ها
        tab_control = ttk.Notebook(self.root)
        self.individual_tab = ttk.Frame(tab_control)
        self.ngo_tab = ttk.Frame(tab_control)
        tab_control.add(self.individual_tab, text="  شخص حقیقی  ")
        tab_control.add(self.ngo_tab, text="  شخصیت حقوقی  ")
        tab_control.pack(fill="both", expand=True, padx=15, pady=5)
        tab_control.bind("<<NotebookTabChanged>>", self.on_tab_change)

        # ساخت تب‌ها
        self.setup_individual_tab()
        self.setup_ngo_tab()

        # دکمه‌های پایین
        btn_frame = Frame(self.root)
        btn_frame.pack(pady=10)

        self.generate_btn = Button(btn_frame, text="تولید CSR و کلیدها", 
                                   command=self.generate, font=self.font_bold,
                                   bg="#2ecc71", fg="white", width=18, height=2)
        self.generate_btn.pack(side="left", padx=5)

        self.verify_profile_btn = Button(btn_frame, text="🔍 اعتبارسنجی پروفایل", 
                                         command=self.verify_profile_only, font=self.font_bold,
                                         bg="#f39c12", fg="white", width=18, height=2)
        self.verify_profile_btn.pack(side="left", padx=5)

        self.verify_btn = Button(btn_frame, text="✅ صحت‌سنجی کلیدها", 
                                 command=self.verify_keys, font=self.font_bold,
                                 bg="#3498db", fg="white", width=18, height=2, state="disabled")
        self.verify_btn.pack(side="left", padx=5)

        self.export_btn = Button(btn_frame, text="📦 استخراج به ZIP", 
                                 command=self.create_zip, font=self.font_bold,
                                 bg="#9b59b6", fg="white", width=18, height=2, state="disabled")
        self.export_btn.pack(side="left", padx=5)

        # لاگ
        log_frame = LabelFrame(self.root, text="وضعیت", font=self.font_bold)
        log_frame.pack(fill="both", expand=True, padx=20, pady=5)

        self.log = Text(log_frame, height=7, font=("Consolas", 9), state="disabled", bg="#f8f9fa")
        self.log.pack(fill="both", expand=True, padx=5, pady=5)

    def setup_individual_tab(self):
        frame = self.individual_tab
        fields = [
            ("نام (به انگلیسی):", "first_name"),
            ("نام خانوادگی (به انگلیسی):", "last_name"),
            ("کد ملی (۱۰ یا ۱۱ رقم):", "national_id"),
            ("شهر:", "city"),
            ("استان:", "province"),
        ]
        self.individual_entries = {}
        for i, (label, key) in enumerate(fields):
            lbl = Label(frame, text=label, font=self.font_normal, anchor="e")
            lbl.grid(row=i, column=1, sticky="e", padx=10, pady=8)
            ent = Entry(frame, font=self.font_normal, width=30)
            ent.grid(row=i, column=0, sticky="w", padx=10, pady=8)
            self.individual_entries[key] = ent

    def setup_ngo_tab(self):
        frame = self.ngo_tab
        fields = [
            ("نام سازمان (به انگلیسی، بدون فاصله):", "org_name"),
            ("شناسه ملی (۱۱ رقم):", "national_id"),
            ("شهر:", "city"),
            ("استان:", "province"),
        ]
        self.ngo_entries = {}
        for i, (label, key) in enumerate(fields):
            lbl = Label(frame, text=label, font=self.font_normal, anchor="e")
            lbl.grid(row=i, column=1, sticky="e", padx=10, pady=8)
            ent = Entry(frame, font=self.font_normal, width=30)
            ent.grid(row=i, column=0, sticky="w", padx=10, pady=8)
            self.ngo_entries[key] = ent

        # فقط واحد ۱ (طبق جدول صفحه ۱۱: 1.OU = نامزاس مان — فارسی)
        lbl = Label(frame, text="واحد سازمانی ۱ (به فارسی):", font=self.font_normal, anchor="e")
        lbl.grid(row=4, column=1, sticky="e", padx=10, pady=8)
        self.ngo_entries["ou1"] = Entry(frame, font=self.font_normal, width=30)
        self.ngo_entries["ou1"].grid(row=4, column=0, sticky="w", padx=10, pady=8)

    def on_tab_change(self, event):
        tab = event.widget.tab(event.widget.select(), "text").strip()
        self.user_type = "individual" if tab == "شخص حقیقی" else "ngo"

    def get_current_data(self):
        if self.user_type == "individual":
            data = {k: v.get().strip() for k, v in self.individual_entries.items()}
            data["type"] = "individual"
            return data
        else:
            data = {k: v.get().strip() for k, v in self.ngo_entries.items()}
            data["type"] = "ngo"
            return data

    def log_message(self, msg, level="info"):
        self.log.config(state="normal")
        prefix = {"info": "ℹ️ ", "success": "✅ ", "error": "❌ ", "warn": "⚠️ "}.get(level, "ℹ️ ")
        self.log.insert(END, f"{prefix}{msg}\n")
        self.log.see(END)
        self.log.config(state="disabled")

    # 🔍 صحت‌سنجی پروفایل (بدون تولید کلید)
    def verify_profile_only(self):
        data = self.get_current_data()
        errors = []

        if data["type"] == "individual":
            if not data.get("first_name"):
                errors.append("نام الزامی است.")
            if not data.get("last_name"):
                errors.append("نام خانوادگی الزامی است.")
            sn = data.get("national_id")
            if not sn or not sn.isdigit() or not (10 <= len(sn) <= 11):
                errors.append("کد ملی باید ۱۰ یا ۱۱ رقمی باشد.")
            cn = f"{data['first_name']} {data['last_name']}".strip()
            if not cn.replace(' ', '').isascii():
                errors.append("نام و نام خانوادگی باید به انگلیسی باشند.")
            if not cn.endswith("[Sign]") and "[Sign]" in cn:
                errors.append("CN نباید دستی [Sign] داشته باشد — سیستم خودکار اضافه می‌کند.")

        else:  # ngo
            org = data.get("org_name")
            if not org:
                errors.append("نام سازمان الزامی است.")
            elif not org.replace('_', '').replace('-', '').isalnum() or not org.isascii():
                errors.append("نام سازمان باید به انگلیسی و بدون فاصله باشد.")
            sn = data.get("national_id")
            if not sn or not sn.isdigit() or len(sn) != 11:
                errors.append("شناسه ملی باید ۱۱ رقمی باشد.")
            ou1 = data.get("ou1")
            if ou1 and not all('\u0600' <= c <= '\u06FF' or c in ' ' for c in ou1):
                errors.append("واحد سازمانی باید به فارسی باشد.")

        # بررسی config.txt موجود (اگر وجود داشت)
        config_path = "config.txt"
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    lines = [l.strip() for l in f if l.strip() and not l.startswith("#")]

                dn_section = False
                fields = {}
                for line in lines:
                    if line == "[dn]":
                        dn_section = True
                        continue
                    if dn_section and "=" in line:
                        k, v = line.split("=", 1)
                        fields[k.strip()] = v.strip()

                # بررسی CN
                cn = fields.get("CN", "")
                if data["type"] == "individual" and not cn.endswith("[Sign]"):
                    errors.append(f"CN در config.txt باید با [Sign] تمام شود. (اکنون: {cn})")
                if data["type"] == "ngo" and not cn.endswith("[Stamp]"):
                    errors.append(f"CN در config.txt باید با [Stamp] تمام شود. (اکنون: {cn})")

                # بررسی O
                o = fields.get("O", "")
                expected_o = "Unaffiliated" if data["type"] == "individual" else "Non-Governmental"
                if o != expected_o:
                    errors.append(f"مقدار O باید '{expected_o}' باشد. (اکنون: {o})")

                # عدم وجود 2.OU, 3.OU
                bad_fields = [k for k in fields if k in ("2.OU", "3.OU")]
                if bad_fields:
                    errors.append(f"فیلدهای نامعتبر در config.txt: {', '.join(bad_fields)} — فقط 1.OU مجاز است.")

                self.log_message("✅ config.txt بررسی شد.", "success")

            except Exception as e:
                self.log_message(f"⚠️ خطا در خواندن config.txt: {e}", "warn")

        if errors:
            for e in errors:
                self.log_message(e, "error")
            messagebox.showerror("خطا در پروفایل", "\n".join(errors))
        else:
            self.log_message("✅ پروفایل مطابق راهنمای GICA است.", "success")
            messagebox.showinfo("اعتبارسنجی", "پروفایل شما معتبر است.\nحالا می‌توانید CSR تولید کنید.")

    def validate_inputs(self):
        data = self.get_current_data()
        if data["type"] == "individual":
            if not data["first_name"] or not data["last_name"]:
                messagebox.showerror("خطا", "نام و نام خانوادگی الزامی است.")
                return False
            if not data["national_id"].isdigit() or not (10 <= len(data["national_id"]) <= 11):
                messagebox.showerror("خطا", "کد ملی باید ۱۰ یا ۱۱ رقمی باشد.")
                return False
        else:
            if not data["org_name"]:
                messagebox.showerror("خطا", "نام سازمان الزامی است.")
                return False
            if not data["org_name"].replace('_', '').replace('-', '').isalnum() or not data["org_name"].isascii():
                messagebox.showerror("خطا", "نام سازمان باید به انگلیسی و بدون فاصله باشد.")
                return False
            if not data["national_id"].isdigit() or len(data["national_id"]) != 11:
                messagebox.showerror("خطا", "شناسه ملی باید ۱۱ رقمی باشد.")
                return False
        if not data["city"] or not data["province"]:
            messagebox.showerror("خطا", "شهر و استان الزامی هستند.")
            return False
        return True

    def generate(self):
        if not self.validate_inputs():
            return

        self.generate_btn.config(state="disabled", text="در حال پردازش...")
        self.log_message("در حال تولید CSR و کلیدها...", "info")

        try:
            if not os.path.exists(OPENSSL_PATH):
                raise FileNotFoundError("OpenSSL یافت نشد. ابتدا از gica.ir دانلود کنید.")

            data = self.get_current_data()
            current_dir = os.getcwd()

            if data["type"] == "individual":
                cn = f"{data['first_name']} {data['last_name']}[Sign]"
                org = "Unaffiliated"
                ou_lines = []
                self.export_name = f"{data['last_name']}_{data['first_name']}"
            else:
                cn = f"{data['org_name']}[Stamp]"
                org = "Non-Governmental"
                ou_lines = []
                if data.get("ou1"):
                    ou_lines.append(f"1.OU = {data['ou1']}")
                self.export_name = data["org_name"]

            config_content = f"""[req]
prompt = no
distinguished_name = dn

[dn]
CN = {cn}
serialNumber = {data['national_id']}
O = {org}
"""
            if ou_lines:
                config_content += "\n".join(ou_lines) + "\n"
            config_content += f"""L = {data['city']}
ST = {data['province']}
C = IR
"""

            config_path = os.path.join(current_dir, "config.txt")
            with open(config_path, "w", encoding="utf-8") as f:
                f.write(config_content)
            self.log_message("✅ config.txt ساخته شد.", "success")

            self.key_path = "mykey.key"
            self.csr_path = "mycsr.txt"
            self.pub_path = "mypublickey.pem"

            for f in [self.key_path, self.csr_path, self.pub_path]:
                if os.path.exists(f):
                    os.remove(f)

            # تولید
            cmd1 = [
                OPENSSL_PATH, "req", "-new", "-utf8", "-nodes",
                "-config", config_path,
                "-newkey", "rsa:2048",
                "-keyout", self.key_path,
                "-out", self.csr_path
            ]
            result = subprocess.run(cmd1, capture_output=True, text=True, encoding="utf-8")
            if result.returncode != 0:
                raise RuntimeError(f"خطا در تولید CSR:\n{result.stderr}")

            cmd2 = [OPENSSL_PATH, "rsa", "-in", self.key_path, "-pubout", "-out", self.pub_path]
            subprocess.run(cmd2, capture_output=True, text=True, encoding="utf-8")

            self.generated = True
            self.verify_btn.config(state="normal")
            self.export_btn.config(state="normal")
            self.log_message("✅ CSR و کلیدها با موفقیت ساخته شدند.", "success")

        except Exception as e:
            self.log_message(f"❌ خطا: {e}", "error")
            messagebox.showerror("خطا", str(e))
        finally:
            self.generate_btn.config(state="normal", text="تولید CSR و کلیدها")

    def verify_keys(self):
        # همان تابع قبلی — فشرده شده برای اختصار
        if not self.generated:
            messagebox.showwarning("اخطار", "ابتدا کلیدها را تولید کنید.")
            return
        self.log_message("در حال صحت‌سنجی کلیدها...", "info")
        ok = True

        try:
            subprocess.run([OPENSSL_PATH, "rsa", "-in", self.key_path, "-check", "-noout"], 
                          check=True, capture_output=True)
            self.log_message("✅ کلید خصوصی معتبر است.", "success")
        except:
            self.log_message("❌ کلید خصوصی نامعتبر است.", "error")
            ok = False

        if os.path.exists(self.pub_path):
            try:
                mod1 = subprocess.check_output([OPENSSL_PATH, "rsa", "-in", self.key_path, "-modulus", "-noout"], text=True).strip()
                mod2 = subprocess.check_output([OPENSSL_PATH, "rsa", "-pubin", "-in", self.pub_path, "-modulus", "-noout"], text=True).strip()
                if mod1 == mod2:
                    self.log_message("✅ کلید عمومی با خصوصی مطابقت دارد.", "success")
                else:
                    self.log_message("❌ عدم تطابق کلید عمومی و خصوصی.", "error")
                    ok = False
            except:
                self.log_message("⚠️ ناتوان در بررسی کلید عمومی.", "warn")

        try:
            subject = subprocess.check_output([OPENSSL_PATH, "req", "-in", self.csr_path, "-noout", "-subject"], text=True)
            sn = self.get_current_data()["national_id"]
            if f"serialNumber={sn}" not in subject:
                self.log_message("❌ serialNumber در CSR نادرست است.", "error")
                ok = False
            else:
                self.log_message("✅ serialNumber در CSR صحیح است.", "success")
        except:
            self.log_message("⚠️ ناتوان در بررسی CSR.", "warn")

        if ok:
            self.log_message("✅ تمام بررسی‌ها موفقیت‌آمیز بود.", "success")
        else:
            self.log_message("❌ برخی خطاها شناسایی شد.", "error")

    def create_zip(self):
        if not self.generated:
            messagebox.showwarning("اخطار", "ابتدا کلیدها را تولید کنید.")
            return

        try:
            now = datetime.now()
            jy = now.year - 621
            if (now.month, now.day) < (3, 21):
                jy -= 1
            date_str = f"{jy:04d}-{now.month:02d}-{now.day:02d}"

            zip_name = f"{self.export_name}_{date_str}.zip"
            zip_path = filedialog.asksaveasfilename(
                title="ذخیره ZIP",
                defaultextension=".zip",
                filetypes=[("ZIP files", "*.zip")],
                initialfile=zip_name
            )
            if not zip_path:
                return

            renames = {
                "mycsr.txt": "CSR.txt",
                "mykey.key": "PrivateKey.key",
                "mypublickey.pem": "PublicKey.pem"
            }

            with zipfile.ZipFile(zip_path, 'w') as zf:
                for src, dst in renames.items():
                    if os.path.exists(src):
                        with open(src, 'rb') as f:
                            zf.writestr(dst, f.read())
                if os.path.exists("config.txt"):
                    zf.write("config.txt", "config.txt")

            self.log_message(f"✅ ZIP ذخیره شد: {os.path.basename(zip_path)}", "success")
            messagebox.showinfo("موفقیت", f"فایل‌ها در\n{zip_path}\nذخیره شدند.")

        except Exception as e:
            self.log_message(f"❌ خطا در ساخت ZIP: {e}", "error")
            messagebox.showerror("خطا", str(e))

    def on_closing(self):
        # تغییر نام فایل‌ها قبل از خروج (اگر وجود داشت)
        renames = [
            ("mycsr.txt", "CSR.txt"),
            ("mykey.key", "PrivateKey.key"),
            ("mypublickey.pem", "PublicKey.pem")
        ]
        for old, new in renames:
            if os.path.exists(old):
                try:
                    os.rename(old, new)
                except Exception as e:
                    self.log_message(f"⚠️ خطا در تغییر نام {old}: {e}", "warn")
        self.root.destroy()

if __name__ == "__main__":
    root = Tk()
    app = CSRGeneratorApp(root)
    root.mainloop()