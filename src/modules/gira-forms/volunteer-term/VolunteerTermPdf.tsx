import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Image, Font,
} from '@react-pdf/renderer';
import type { OrgLegalSettings, VolunteerData } from './types';

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 18,
    borderBottom: '1pt solid #2E7D32',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  headerText: { fontSize: 9, color: '#555', textAlign: 'right' },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paragraph: { marginBottom: 8, textAlign: 'justify' },
  bold: { fontFamily: 'Helvetica-Bold' },
  clauseTitle: {
    fontFamily: 'Helvetica-Bold',
    marginTop: 10,
    marginBottom: 4,
    fontSize: 10.5,
  },
  signatureBlock: {
    marginTop: 28,
    borderTop: '1pt solid #ccc',
    paddingTop: 14,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sigBox: { width: '48%' },
  sigImage: { width: 200, height: 70, objectFit: 'contain' },
  sigLine: { borderBottom: '0.5pt solid #333', marginBottom: 3, height: 50 },
  sigLabel: { fontSize: 9, color: '#444' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 50,
    right: 50,
    fontSize: 7.5,
    color: '#666',
    borderTop: '0.5pt solid #ccc',
    paddingTop: 6,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hashLine: { fontFamily: 'Courier', fontSize: 7, color: '#444', marginTop: 2 },
});

interface TermPdfProps {
  org: OrgLegalSettings;
  volunteer: VolunteerData;
  signatureImage?: string; // dataURL when canvas
  signatureText?: string; // when typed
  metodo: 'canvas' | 'digitado';
  assinadoEm: string;
  ip: string;
  hash?: string; // injetado APÓS gerar para preview/segunda passada (deixamos placeholder no rodapé)
  termoId: string;
  cidadeEntidade: string;
}

const fmt = (s: string | null | undefined, fallback = '[A configurar]') =>
  s && s.trim() ? s : fallback;

export const VolunteerTermPdf: React.FC<TermPdfProps> = ({
  org, volunteer, signatureImage, signatureText, metodo, assinadoEm,
  ip, hash, termoId, cidadeEntidade,
}) => {
  const dataPt = new Date(assinadoEm).toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });

  const razaoSocial = fmt(org.razao_social);
  const cnpj = fmt(org.cnpj);
  const enderecoOrg = fmt(org.endereco);
  const cidadeOrg = fmt(org.cidade ? `${org.cidade}${org.estado ? ' / ' + org.estado : ''}` : null, cidadeEntidade || '[A configurar]');

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          {org.logo_url ? <Image src={org.logo_url} style={styles.logo} /> : <View style={styles.logo} />}
          <View>
            <Text style={[styles.headerText, styles.bold]}>TERMO DE COMPROMISSO</Text>
            <Text style={styles.headerText}>Lei Federal nº 9.608/1998 · LGPD nº 13.709/2020</Text>
            <Text style={styles.headerText}>Documento {termoId.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.title}>Termo de Compromisso de Serviço Voluntário</Text>

        <Text style={styles.paragraph}>
          Pelo presente instrumento, de um lado:
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>ORGANIZAÇÃO:</Text> {razaoSocial}, inscrita no CNPJ sob nº {cnpj},
          com sede em {enderecoOrg}, doravante denominada <Text style={styles.bold}>ENTIDADE</Text>;
        </Text>

        <Text style={styles.paragraph}>E de outro lado:</Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>VOLUNTÁRIO(A):</Text> {volunteer.nome}, portador(a) do CPF nº {fmt(volunteer.cpf, '—')},
          residente em {fmt(volunteer.cidadeEstado, '—')}, e-mail {fmt(volunteer.email, '—')},
          doravante denominado(a) <Text style={styles.bold}>VOLUNTÁRIO(A)</Text>.
        </Text>

        <Text style={styles.paragraph}>
          As partes acima identificadas celebram o presente Termo de Compromisso de Serviço Voluntário,
          nos termos da Lei Federal nº 9.608, de 18 de fevereiro de 1998, mediante as seguintes cláusulas:
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 1ª — DO OBJETO</Text>
        <Text style={styles.paragraph}>
          O(A) VOLUNTÁRIO(A) compromete-se a prestar serviços voluntários à ENTIDADE, de natureza não
          remunerada, nas áreas de atuação indicadas em seu cadastro, sem vínculo empregatício, previdenciário
          ou obrigação de qualquer natureza entre as partes, conforme art. 1º da Lei 9.608/1998.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 2ª — DA VIGÊNCIA</Text>
        <Text style={styles.paragraph}>
          O presente termo tem vigência por prazo indeterminado, podendo ser rescindido por qualquer
          das partes mediante comunicação prévia de 15 (quinze) dias, sem ônus.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 3ª — DAS ATIVIDADES</Text>
        <Text style={styles.paragraph}>
          As atividades serão definidas de comum acordo, respeitando a disponibilidade declarada pelo(a)
          VOLUNTÁRIO(A) no ato do cadastro, podendo ser presenciais, remotas ou híbridas conforme acordado.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 4ª — DA AUSÊNCIA DE REMUNERAÇÃO</Text>
        <Text style={styles.paragraph}>
          O serviço prestado é de caráter voluntário e não enseja qualquer remuneração, salvo o ressarcimento
          de despesas previamente aprovadas pela ENTIDADE, nos termos do parágrafo único do art. 3º da Lei 9.608/1998.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 5ª — DA PROTEÇÃO DE DADOS (LGPD)</Text>
        <Text style={styles.paragraph}>
          Em conformidade com a Lei Federal nº 13.709/2020 (LGPD), o(a) VOLUNTÁRIO(A) consente expressamente
          com o tratamento dos seus dados pessoais fornecidos neste cadastro, para as seguintes finalidades:
          {'\n'}a) Gestão e comunicação das atividades voluntárias;
          {'\n'}b) Emissão deste termo e controle de assinaturas;
          {'\n'}c) Envio de informações institucionais pertinentes.
          {'\n'}Os dados serão armazenados de forma segura, não serão compartilhados com terceiros sem
          consentimento e poderão ser excluídos mediante solicitação ao DPO da ENTIDADE.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 6ª — DA ASSINATURA ELETRÔNICA</Text>
        <Text style={styles.paragraph}>
          A assinatura eletrônica aposta neste documento possui validade jurídica nos termos do art. 10
          da MP 2.200-2/2001 e do Marco Civil da Internet (Lei 12.965/2014), sendo o hash SHA-256 deste
          documento a prova de integridade e autenticidade do ato.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 14 }]}>
          Local e data: {cidadeOrg}, {dataPt}.
        </Text>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureRow}>
            <View style={styles.sigBox}>
              {metodo === 'canvas' && signatureImage ? (
                <Image src={signatureImage} style={styles.sigImage} />
              ) : (
                <View style={[styles.sigLine, { justifyContent: 'flex-end' }]}>
                  <Text style={{ fontFamily: 'Helvetica-Oblique', fontSize: 14, marginBottom: 2 }}>
                    {signatureText || volunteer.nome}
                  </Text>
                </View>
              )}
              <View style={{ borderTop: '0.5pt solid #333', marginTop: 2 }} />
              <Text style={styles.sigLabel}>{volunteer.nome}</Text>
              <Text style={styles.sigLabel}>CPF: {fmt(volunteer.cpf, '—')}</Text>
              <Text style={styles.sigLabel}>
                Assinatura {metodo === 'canvas' ? 'manuscrita digital' : 'digitada'}
              </Text>
            </View>

            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>{razaoSocial}</Text>
              <Text style={styles.sigLabel}>CNPJ: {cnpj}</Text>
              <Text style={styles.sigLabel}>Representante legal</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <Text>Assinado eletronicamente em {dataPt}</Text>
            <Text>IP: {ip || '—'}</Text>
          </View>
          <Text style={styles.hashLine}>
            SHA-256: {hash || '—'.repeat(8)}
          </Text>
          <Text style={[styles.hashLine, { color: '#888' }]}>
            Registro nº {termoId} · Documento gerado em conformidade com MP 2.200-2/2001 e Lei 12.965/2014
          </Text>
        </View>
      </Page>
    </Document>
  );
};
