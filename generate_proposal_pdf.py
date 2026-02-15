from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 16)
        self.cell(0, 10, 'Detalhamento de Custos e Proposta Comercial', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Página {self.page_no()}', 0, 0, 'C')

def create_pdf():
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title Styles
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Resumo Financeiro do Sistema IoT', 0, 1, 'L')
    pdf.ln(5)
    
    # Body Styles
    pdf.set_font('Arial', '', 11)
    
    introduction = (
        "Este documento apresenta o detalhamento dos custos de infraestrutura e serviços "
        "para o sistema de monitoramento de temperatura, ignorando os custos de hardware. "
        "Abaixo estão descritas três opções de planos comerciais."
    )
    pdf.multi_cell(0, 7, introduction.encode('latin-1', 'replace').decode('latin-1'))
    pdf.ln(5)

    # --- PLANO BÁSICO ---
    pdf.set_fill_color(240, 240, 240)
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Opção A: Plano Básico (Entrada)', 0, 1, 'L', True)
    pdf.set_font('Arial', '', 11)
    
    pdf.multi_cell(0, 7, "Ideal para clientes que precisam apenas de alertas via WhatsApp.".encode('latin-1', 'replace').decode('latin-1'))
    pdf.ln(2)
    
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 7, 'Valores ao Cliente:', 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.cell(10)
    pdf.cell(0, 7, '- Implantação (Setup Único): R$ 800,00 – R$ 1.500,00'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.cell(10)
    pdf.cell(0, 7, '- Mensalidade (Recorrência): R$ 200,00 – R$ 350,00 (até 10 pontos)'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.ln(3)

    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 7, 'Custos Operacionais (Seus Custos):', 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.cell(10)
    pdf.cell(0, 7, '- Infraestrutura Mensal: ~R$ 48 – R$ 89'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.cell(20)
    pdf.cell(0, 7, '(VPS Simples + WhatsApp API + IA Básica)'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.cell(10)
    pdf.cell(0, 7, '- Margem de Lucro: ~70% – 75%'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.ln(5)

    # --- PLANO PROFISSIONAL ---
    pdf.set_fill_color(230, 240, 255)
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Opção B: Plano Profissional (Recomendado)', 0, 1, 'L', True)
    pdf.set_font('Arial', '', 11)
    
    pdf.multi_cell(0, 7, "Inclui Dashboard Web e Monitoramento Profissional.".encode('latin-1', 'replace').decode('latin-1'))
    pdf.ln(2)
    
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 7, 'Valores ao Cliente:', 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.cell(10)
    pdf.cell(0, 7, '- Implantação (Setup Único): R$ 1.500,00 – R$ 2.500,00'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.cell(10)
    pdf.cell(0, 7, '- Mensalidade (Recorrência): R$ 350,00 – R$ 600,00 (até 10 pontos)'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.ln(3)

    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 7, 'Custos Operacionais (Seus Custos):', 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.cell(10)
    pdf.cell(0, 7, '- Infraestrutura Mensal: ~R$ 72 – R$ 97'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.cell(20)
    pdf.cell(0, 7, '(VPS Melhor + Domínio + Dashboard Web)'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.cell(10)
    pdf.cell(0, 7, '- Margem de Lucro: ~75% – 85%'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.ln(5)

    # --- PLANO COMPLETO ---
    pdf.set_fill_color(255, 240, 240)
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Opção C: Plano Completo (Premium)', 0, 1, 'L', True)
    pdf.set_font('Arial', '', 11)
    
    pdf.multi_cell(0, 7, "Solução total com App Mobile (Android/iOS).".encode('latin-1', 'replace').decode('latin-1'))
    pdf.ln(2)
    
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 7, 'Valores ao Cliente:', 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.cell(10)
    pdf.cell(0, 7, '- Implantação (Setup Único): R$ 3.000,00 – R$ 5.000,00'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.cell(10)
    pdf.cell(0, 7, '- Mensalidade (Recorrência): R$ 600,00 – R$ 900,00 (até 10 pontos)'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.ln(3)

    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 7, 'Custos Operacionais (Seus Custos):', 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.cell(10)
    pdf.cell(0, 7, '- Infraestrutura Mensal: ~R$ 124 – R$ 197'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.cell(20)
    pdf.cell(0, 7, '(Infra Completa + Taxas App Stores)'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.cell(10)
    pdf.cell(0, 7, '- Margem de Lucro: ~70% – 80%'.encode('latin-1', 'replace').decode('latin-1'), 0, 1)
    pdf.ln(10)

    # --- CONCLUSION ---
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Recomendação Final', 0, 1, 'L')
    pdf.set_font('Arial', '', 11)
    pdf.multi_cell(0, 7, "Recomenda-se a Opção B (Profissional) por oferecer o melhor equilíbrio entre valor percebido (Dashboard Web) e custo operacional, sem a complexidade de manter aplicativos nas lojas.".encode('latin-1', 'replace').decode('latin-1'))

    pdf.output("Detalhamento_Custos_Sistema.pdf")
    print("PDF gerado com sucesso: Detalhamento_Custos_Sistema.pdf")

if __name__ == "__main__":
    create_pdf()
