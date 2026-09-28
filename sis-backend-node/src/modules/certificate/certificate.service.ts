import { CertificateRepository } from './certificate.repository';

export class CertificateService {
  // Certificates
  static async getCertificates(id?: any) {
    const raw = await CertificateRepository.getCertificates(id);
    if (!raw) return id ? null : [];

    const formatCert = (cert: any) => ({
      id: cert.id,
      name: cert.certificate_name,
      certificate_name: cert.certificate_name,
      headerLeft: cert.left_header || '',
      headerCenter: cert.center_header || '',
      headerRight: cert.right_header || '',
      bodyText: cert.certificate_text || '',
      certificate_text: cert.certificate_text || '',
      footerLeft: cert.left_footer || '',
      footerCenter: cert.center_footer || '',
      footerRight: cert.right_footer || '',
      headerHeight: parseInt(cert.header_height || '80', 10),
      footerHeight: parseInt(cert.footer_height || '80', 10),
      bodyHeight: parseInt(cert.content_height || '180', 10),
      bodyWidth: parseInt(cert.content_width || '600', 10),
      photoToggle: cert.enable_student_image === 1 || cert.enable_student_image === '1',
      bgImage: cert.background_image || 'certificate_backdrop.png',
      background_image: cert.background_image || 'certificate_backdrop.png',
      layoutConfig: cert.layout_config ? (typeof cert.layout_config === 'string' ? JSON.parse(cert.layout_config) : cert.layout_config) : null
    });

    if (id) {
      return formatCert(raw);
    }
    return Array.isArray(raw) ? raw.map(formatCert) : [];
  }

  static async createCertificate(data: any) {
    return await CertificateRepository.createCertificate(data);
  }

  static async updateCertificate(id: any, data: any) {
    return await CertificateRepository.updateCertificate(id, data);
  }

  static async deleteCertificate(id: any) {
    return await CertificateRepository.deleteCertificate(id);
  }

  // ID Cards
  static async getIdCards(id?: any) {
    const raw = await CertificateRepository.getIdCards(id);
    if (!raw) return id ? null : [];

    const formatCard = (card: any) => ({
      id: card.id,
      name: card.title,
      title: card.title,
      schoolName: card.school_name || 'Sahyadri International School',
      school_name: card.school_name || 'Sahyadri International School',
      address: card.school_address || '',
      school_address: card.school_address || '',
      headerColor: card.header_color || '#1e3a8a',
      header_color: card.header_color || '#1e3a8a',
      logo: card.logo || '',
      bgImage: card.background || '',
      background: card.background || '',
      signature: card.sign_image || '',
      sign_image: card.sign_image || '',
      showAdmNo: card.enable_admission_no === 1,
      showName: card.enable_student_name === 1,
      showClass: card.enable_class === 1,
      showFather: card.enable_fathers_name === 1,
      showMother: card.enable_mothers_name === 1,
      showAddress: card.enable_address === 1,
      showPhone: card.enable_phone === 1,
      showDOB: card.enable_dob === 1,
      showBloodGroup: card.enable_blood_group === 1,
      layoutConfig: card.layout_config ? (typeof card.layout_config === 'string' ? JSON.parse(card.layout_config) : card.layout_config) : null
    });

    if (id) {
      return formatCard(raw);
    }
    return Array.isArray(raw) ? raw.map(formatCard) : [];
  }

  static async createIdCard(data: any) {
    return await CertificateRepository.createIdCard(data);
  }

  static async updateIdCard(id: any, data: any) {
    return await CertificateRepository.updateIdCard(id, data);
  }

  static async deleteIdCard(id: any) {
    return await CertificateRepository.deleteIdCard(id);
  }

  // Generate Certificates / ID Cards
  static async generateCertificates(templateId: any, studentIds: any[]) {
    const template = (await this.getCertificates(templateId)) as any;
    if (!template) throw new Error('Certificate template not found');

    const students = await CertificateRepository.getStudentsForGeneration(studentIds);

    return students.map((stu: any) => {
      let body = template.bodyText || template.certificate_text || '';
      body = body.replace(/\[name\]/gi, `${stu.firstname || ''} ${stu.lastname || ''}`.trim());
      body = body.replace(/\[roll_no\]/gi, stu.roll_no || '');
      body = body.replace(/\[admission_no\]/gi, stu.admission_no || '');
      body = body.replace(/\[class\]/gi, stu.class_name || '');
      body = body.replace(/\[section\]/gi, stu.section_name || '');
      body = body.replace(/\[father_name\]/gi, stu.father_name || '');
      body = body.replace(/\[mother_name\]/gi, stu.mother_name || '');
      body = body.replace(/\[dob\]/gi, stu.dob || '');
      body = body.replace(/\[gender\]/gi, stu.gender || '');

      return {
        student_id: stu.id,
        student_name: `${stu.firstname || ''} ${stu.lastname || ''}`.trim(),
        admission_no: stu.admission_no,
        class: stu.class_name,
        section: stu.section_name,
        generated_text: body,
        template
      };
    });
  }

  static async generateIdCards(templateId: any, studentIds: any[]) {
    const template = (await this.getIdCards(templateId)) as any;
    if (!template) throw new Error('ID Card template not found');

    const students = await CertificateRepository.getStudentsForGeneration(studentIds);

    return students.map((stu: any) => ({
      student_id: stu.id,
      student_name: `${stu.firstname || ''} ${stu.lastname || ''}`.trim(),
      admission_no: stu.admission_no,
      class: stu.class_name,
      section: stu.section_name,
      father_name: stu.father_name,
      mother_name: stu.mother_name,
      address: stu.current_address || stu.permanent_address,
      phone: stu.mobileno || stu.guardian_phone,
      dob: stu.dob,
      blood_group: stu.blood_group,
      photo: stu.image || '',
      template
    }));
  }
}
