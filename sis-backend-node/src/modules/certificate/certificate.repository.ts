import { query, queryOne, execute } from '../../config/database';

export class CertificateRepository {
  // Certificates
  static async getCertificates(id?: any) {
    if (id) {
      return await queryOne(`SELECT * FROM certificates WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM certificates ORDER BY id DESC`);
  }

  static async createCertificate(data: any) {
    return await execute(`
      INSERT INTO certificates (
        certificate_name, certificate_text, left_header, center_header, right_header,
        left_footer, right_footer, center_footer, background_image,
        header_height, content_height, footer_height, content_width,
        enable_student_image, layout_config, status, created_for
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 2)
    `, [
      data.certificate_name || data.name || '',
      data.certificate_text || data.bodyText || '',
      data.left_header || data.headerLeft || '',
      data.center_header || data.headerCenter || '',
      data.right_header || data.headerRight || '',
      data.left_footer || data.footerLeft || '',
      data.right_footer || data.footerRight || '',
      data.center_footer || data.footerCenter || '',
      data.background_image || data.bgImage || 'certificate_backdrop.png',
      data.header_height || data.headerHeight || 80,
      data.content_height || data.bodyHeight || 180,
      data.footer_height || data.footerHeight || 80,
      data.content_width || data.bodyWidth || 600,
      data.enable_student_image || data.photoToggle ? 1 : 0,
      typeof data.layout_config === 'object' ? JSON.stringify(data.layout_config) : (data.layout_config || data.layoutConfig || null)
    ]);
  }

  static async updateCertificate(id: any, data: any) {
    return await execute(`
      UPDATE certificates
      SET certificate_name = COALESCE(?, certificate_name),
          certificate_text = COALESCE(?, certificate_text),
          left_header = COALESCE(?, left_header),
          center_header = COALESCE(?, center_header),
          right_header = COALESCE(?, right_header),
          left_footer = COALESCE(?, left_footer),
          right_footer = COALESCE(?, right_footer),
          center_footer = COALESCE(?, center_footer),
          background_image = COALESCE(?, background_image),
          header_height = COALESCE(?, header_height),
          content_height = COALESCE(?, content_height),
          footer_height = COALESCE(?, footer_height),
          content_width = COALESCE(?, content_width),
          enable_student_image = COALESCE(?, enable_student_image),
          layout_config = COALESCE(?, layout_config)
      WHERE id = ?
    `, [
      data.certificate_name || data.name,
      data.certificate_text || data.bodyText,
      data.left_header || data.headerLeft,
      data.center_header || data.headerCenter,
      data.right_header || data.headerRight,
      data.left_footer || data.footerLeft,
      data.right_footer || data.footerRight,
      data.center_footer || data.footerCenter,
      data.background_image || data.bgImage,
      data.header_height || data.headerHeight,
      data.content_height || data.bodyHeight,
      data.footer_height || data.footerHeight,
      data.content_width || data.bodyWidth,
      data.enable_student_image !== undefined ? (data.enable_student_image ? 1 : 0) : (data.photoToggle !== undefined ? (data.photoToggle ? 1 : 0) : null),
      typeof data.layout_config === 'object' ? JSON.stringify(data.layout_config) : (data.layout_config || data.layoutConfig),
      id
    ]);
  }

  static async deleteCertificate(id: any) {
    return await execute(`DELETE FROM certificates WHERE id = ?`, [id]);
  }

  // ID Cards
  static async getIdCards(id?: any) {
    if (id) {
      return await queryOne(`SELECT * FROM id_card WHERE id = ?`, [id]);
    }
    return await query(`SELECT * FROM id_card ORDER BY id DESC`);
  }

  static async createIdCard(data: any) {
    return await execute(`
      INSERT INTO id_card (
        title, school_name, school_address, background, logo, sign_image, header_color,
        enable_admission_no, enable_student_name, enable_class, enable_fathers_name,
        enable_mothers_name, enable_address, enable_phone, enable_dob, enable_blood_group,
        status, layout_config
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `, [
      data.title || data.name || '',
      data.school_name || data.schoolName || 'Sahyadri International School',
      data.school_address || data.address || '',
      data.background || data.bgImage || '',
      data.logo || '',
      data.sign_image || data.signature || '',
      data.header_color || data.headerColor || '#1e3a8a',
      data.enable_admission_no || data.showAdmNo ? 1 : 0,
      data.enable_student_name || data.showName ? 1 : 0,
      data.enable_class || data.showClass ? 1 : 0,
      data.enable_fathers_name || data.showFather ? 1 : 0,
      data.enable_mothers_name || data.showMother ? 1 : 0,
      data.enable_address || data.showAddress ? 1 : 0,
      data.enable_phone || data.showPhone ? 1 : 0,
      data.enable_dob || data.showDOB ? 1 : 0,
      data.enable_blood_group || data.showBloodGroup ? 1 : 0,
      typeof data.layout_config === 'object' ? JSON.stringify(data.layout_config) : (data.layout_config || data.layoutConfig || null)
    ]);
  }

  static async updateIdCard(id: any, data: any) {
    return await execute(`
      UPDATE id_card
      SET title = COALESCE(?, title),
          school_name = COALESCE(?, school_name),
          school_address = COALESCE(?, school_address),
          background = COALESCE(?, background),
          logo = COALESCE(?, logo),
          sign_image = COALESCE(?, sign_image),
          header_color = COALESCE(?, header_color),
          enable_admission_no = COALESCE(?, enable_admission_no),
          enable_student_name = COALESCE(?, enable_student_name),
          enable_class = COALESCE(?, enable_class),
          enable_fathers_name = COALESCE(?, enable_fathers_name),
          enable_mothers_name = COALESCE(?, enable_mothers_name),
          enable_address = COALESCE(?, enable_address),
          enable_phone = COALESCE(?, enable_phone),
          enable_dob = COALESCE(?, enable_dob),
          enable_blood_group = COALESCE(?, enable_blood_group),
          layout_config = COALESCE(?, layout_config)
      WHERE id = ?
    `, [
      data.title || data.name,
      data.school_name || data.schoolName,
      data.school_address || data.address,
      data.background || data.bgImage,
      data.logo,
      data.sign_image || data.signature,
      data.header_color || data.headerColor,
      data.enable_admission_no !== undefined ? (data.enable_admission_no ? 1 : 0) : (data.showAdmNo !== undefined ? (data.showAdmNo ? 1 : 0) : null),
      data.enable_student_name !== undefined ? (data.enable_student_name ? 1 : 0) : (data.showName !== undefined ? (data.showName ? 1 : 0) : null),
      data.enable_class !== undefined ? (data.enable_class ? 1 : 0) : (data.showClass !== undefined ? (data.showClass ? 1 : 0) : null),
      data.enable_fathers_name !== undefined ? (data.enable_fathers_name ? 1 : 0) : (data.showFather !== undefined ? (data.showFather ? 1 : 0) : null),
      data.enable_mothers_name !== undefined ? (data.enable_mothers_name ? 1 : 0) : (data.showMother !== undefined ? (data.showMother ? 1 : 0) : null),
      data.enable_address !== undefined ? (data.enable_address ? 1 : 0) : (data.showAddress !== undefined ? (data.showAddress ? 1 : 0) : null),
      data.enable_phone !== undefined ? (data.enable_phone ? 1 : 0) : (data.showPhone !== undefined ? (data.showPhone ? 1 : 0) : null),
      data.enable_dob !== undefined ? (data.enable_dob ? 1 : 0) : (data.showDOB !== undefined ? (data.showDOB ? 1 : 0) : null),
      data.enable_blood_group !== undefined ? (data.enable_blood_group ? 1 : 0) : (data.showBloodGroup !== undefined ? (data.showBloodGroup ? 1 : 0) : null),
      typeof data.layout_config === 'object' ? JSON.stringify(data.layout_config) : (data.layout_config || data.layoutConfig),
      id
    ]);
  }

  static async deleteIdCard(id: any) {
    return await execute(`DELETE FROM id_card WHERE id = ?`, [id]);
  }

  // Student Data for Generation
  static async getStudentsForGeneration(studentIds: (number | string)[]) {
    if (!studentIds || studentIds.length === 0) return [];
    const placeholders = studentIds.map(() => '?').join(',');
    return await query(`
      SELECT s.*, c.class as class_name, sec.section as section_name
      FROM students s
      LEFT JOIN student_session ss ON ss.student_id = s.id
      LEFT JOIN classes c ON c.id = ss.class_id
      LEFT JOIN sections sec ON sec.id = ss.section_id
      WHERE s.id IN (${placeholders})
    `, studentIds);
  }
}
