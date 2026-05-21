// 1. Sistem Memori Status (State Management)
let keranjang = [];

// 2. Setup URL Webhook Make.com dan WhatsApp
// URL Webhook milikmu sudah dimasukkan di sini
const URL_WEBHOOK_TRANSAKSI = 'https://hook.eu1.make.com/vp0v507ikkh7wgxk644wduhcyyy6hkub'; 
const nomorWA = "6281215540473"; // Nomor temanmu

// Fungsi Format Rupiah
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(angka);
};

// 3. Fungsi Menambah ke Keranjang
function tambahKeKeranjang(namaProduk, hargaProduk) {
    const indexProduk = keranjang.findIndex(item => item.nama === namaProduk);
    
    if (indexProduk !== -1) {
        keranjang[indexProduk].qty += 1;
    } else {
        keranjang.push({
            nama: namaProduk,
            harga: hargaProduk,
            qty: 1
        });
    }
    
    alert(`${namaProduk} berhasil ditambahkan ke keranjang!`);
    updateUICart();
}

// 4. Fungsi Render (Memperbarui tampilan keranjang HTML)
function updateUICart() {
    const daftarKeranjangUI = document.getElementById('daftar-keranjang');
    const totalBayarUI = document.getElementById('total-bayar');
    const countCartUI = document.getElementById('count-cart');
    
    let totalHarga = 0;
    let totalItem = 0;
    
    daftarKeranjangUI.innerHTML = '';
    
    if (keranjang.length === 0) {
        daftarKeranjangUI.innerHTML = '<p>Keranjang masih kosong.</p>';
    } else {
        keranjang.forEach(item => {
            totalHarga += (item.harga * item.qty);
            totalItem += item.qty;
            
            daftarKeranjangUI.innerHTML += `
                <div class="cart-item">
                    <span>${item.nama} (x${item.qty})</span>
                    <span>${formatRupiah(item.harga * item.qty)}</span>
                </div>
            `;
        });
    }
    
    totalBayarUI.textContent = formatRupiah(totalHarga);
    countCartUI.textContent = totalItem;
}

// 5. Logika Checkout Ganda: Kirim Data ke Make.com & Redirect ke WhatsApp
document.getElementById('btn-checkout').addEventListener('click', async () => {
    // Validasi keranjang kosong
    if (keranjang.length === 0) {
        alert("Keranjang masih kosong! Silakan pilih menu dulu.");
        return;
    }

    // Validasi nama
    const namaPemesan = document.getElementById('nama-pemesan').value;
    if (!namaPemesan) {
        alert("Nama pemesan wajib diisi!");
        return;
    }

    // Mengambil data formulir
    const opsiPengantaran = document.getElementById('opsi-pengantaran').value;
    const opsiPembayaran = document.getElementById('opsi-pembayaran').value;
    
    // Generate Invoice / Nomor Nota
    const nomorNota = "INV-" + Date.now().toString().slice(-6);
    const statusPembayaran = (opsiPembayaran === "QRIS") ? "Menunggu Bukti Transfer" : "Belum Lunas";

    // Menyusun teks orderan untuk Excel dan WA
    let daftarOrderanWA = '';
    let totalFinal = 0;
    keranjang.forEach(item => {
        daftarOrderanWA += `- ${item.nama} (${item.qty}x)\n`;
        totalFinal += (item.harga * item.qty);
    });

    // Struktur Data (JSON) yang akan ditembak ke Webhook Make.com
    const dataPesanan = {
        nota: nomorNota,
        nama: namaPemesan,
        pengantaran: opsiPengantaran,
        pembayaran: opsiPembayaran,
        status_pembayaran: statusPembayaran,
        detail_orderan: daftarOrderanWA, // Dikirim sebagai teks agar mudah masuk Excel
        total: totalFinal
    };

    // Teks Pesan untuk WhatsApp
    const pesanTextWA = `*PESANAN BARU*

*Nomor Nota :* ${nomorNota}
*Nama Pemesan :* ${namaPemesan}
*Opsi Pengantaran :* ${opsiPengantaran}
*Opsi Pembayaran :* ${opsiPembayaran}
*Status Pembayaran :* ${statusPembayaran}

*Daftar Orderan :*
${daftarOrderanWA}
*Total :* ${formatRupiah(totalFinal)}

_Konfirmasi segera ke pemesan._`;

    const urlWA = `https://wa.me/${nomorWA}?text=${encodeURIComponent(pesanTextWA)}`;

    // Merubah tombol jadi loading state
    const btnCheckout = document.getElementById('btn-checkout');
    btnCheckout.textContent = "Memproses Data...";
    btnCheckout.disabled = true;

    try {
        // Eksekusi pengiriman data ke Make.com
        const response = await fetch(URL_WEBHOOK_TRANSAKSI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataPesanan)
        });

        // Apapun responsenya, kembalikan tombol ke semula dan buka WA
        btnCheckout.textContent = "Kirim Pesanan & Record";
        btnCheckout.disabled = false;

        if (response.ok) {
            console.log("Data sukses masuk Make.com/Excel");
            window.open(urlWA, '_blank');
        } else {
            console.error("Gagal record, lanjut ke WA");
            window.open(urlWA, '_blank');
        }
    } catch (error) {
        // Jika ada error jaringan/cors, tetap lanjut buka WA
        console.error("Error jaringan saat menembak Webhook:", error);
        btnCheckout.textContent = "Kirim Pesanan & Record";
        btnCheckout.disabled = false;
        window.open(urlWA, '_blank');
    }
});