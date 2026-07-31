export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password } = req.body;

    // Hardcoded users database (secure - only accessible via serverless function)
    const users = [
        { username: 'يوسف', password: '0338', payment_status: 'Paid' },
        { username: 'فراو', password: '07072000', payment_status: 'Paid' },
        // مريم محمد عادل
        { username: 'maryam_m_a', password: '026369', payment_status: 'unpaid' },
        // مروان محمود سعد
        { username: 'marwan_m_s', password: '601279', payment_status: 'Paid' },
        // آسر احمد اسماعيل
        { username: 'aser_a_i', password: '828598', payment_status: 'Paid' },
        // معاذ اسلام محمد
        { username: 'moaz_i_m', password: '060959', payment_status: 'Paid' },
        // مؤمن اسلام محمد
        { username: 'moamen_i_m', password: '567369', payment_status: 'Paid' },
        // يونس عمرو محمد
        { username: 'younes_a_m', password: '924355', payment_status: 'Paid' },
        // آن سعيد محمد
        { username: 'ann_s_m', password: '039347', payment_status: 'Paid' },
        // ياسين سعيد محمد
        { username: 'yassin_s_m', password: '227864', payment_status: 'Paid' },
        // عمر حسام عبد النبي
        { username: 'omar_h_a', password: '299741', payment_status: 'Paid' },
        // معاذ خالد محمد
        { username: 'moaz_k_m', password: '602164', payment_status: 'Paid' },
        // يوسف كريم علي
        { username: 'youssef_k_a', password: '702665', payment_status: 'Paid' },
        // مريم كريم علي
        { username: 'maryam_k_a', password: '006026', payment_status: 'Paid' },
        // نوران احمد محمد محمد
        { username: 'nouran_a_m', password: '553945', payment_status: 'Paid' },
        // حمزه احمد محمد محمد
        { username: 'hamza_a_m', password: '210507', payment_status: 'Paid' },
        // جويرية علي حسين
        { username: 'juwairiyah_a_h', password: '156040', payment_status: 'Paid' },
        // محمد أحمد محمود
        { username: 'mohamed_a_m', password: '551721', payment_status: 'Paid' },
        // مريم محمد سعيد
        { username: 'maryam_m_s', password: '874216', payment_status: 'Paid' },
        // ليان احمد جمال
        { username: 'layan_a_g', password: '629154', payment_status: 'Paid' },
        // خديجة مصطفي محمود
        { username: 'khadija_m_m', password: '190263', payment_status: 'Paid' },
        // فريدة احمد محمد
        { username: 'farida_a_m', password: '500369', payment_status: 'Paid' },
        // أدم مصطفى علاء الدين
        { username: 'adam_m_a', password: '516461', payment_status: 'Paid' },
        // حمزه احمد السعيد
        { username: 'hamza_a_e', password: '726208', payment_status: 'Paid' },
        // هنا احمد السعيد
        { username: 'hana_a_e', password: '780352', payment_status: 'Paid' },
        // فريده احمد ناصر
        { username: 'farida_a_n', password: '628645', payment_status: 'Paid' },
        // مصطفى محمد مصطفى
        { username: 'mostafa_m_m', password: '217412', payment_status: 'Paid' },
        // عمرو محمد عبد الحسيب
        { username: 'amr_m_a', password: '233039', payment_status: 'Paid' },
        // ياسين محمد عبد الحسيب
        { username: 'yassin_m_a', password: '107149', payment_status: 'Paid' },
        // ادهم ايمن محمد
        { username: 'adham_a_m', password: '535411', payment_status: 'Paid' },
        // مروان احمد حمدي
        { username: 'marwan_a_h', password: '461907', payment_status: 'Paid' },
        // احمد سامح محمد
        { username: 'ahmed_s_m', password: '545119', payment_status: 'Paid' },
        // محمد خالد هارون
        { username: 'mohamed_k_h', password: '426072', payment_status: 'Paid' },
        // ادم خالد هارون
        { username: 'adam_k_h', password: '944534', payment_status: 'Paid' },
        // يس طارق إبراهيم
        { username: 'yas_t_i', password: '180746', payment_status: 'Paid' },
        // مالك وائل عبّد الحسيب
        { username: 'malik_w_a', password: '063972', payment_status: 'Paid' },
        // ادم محمد محمود
        { username: 'adam_m_m', password: '524817', payment_status: 'Paid' },
    ];

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        if (user.payment_status === 'Paid') {
            return res.status(200).json({ success: true, user: { username: user.username } });
        } else {
            return res.status(403).json({ success: false, error: 'Your account is not activated. Please contact the academy administration to complete your payment.' });
        }
    } else {
        return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
}
