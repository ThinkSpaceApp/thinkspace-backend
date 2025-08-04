import { Injectable, Logger } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import * as fs from 'fs/promises';
import axios from 'axios';
import { Glm45Service } from './glm-4.5.service';

@Injectable()
export class PdfProcessorService {
  private readonly logger = new Logger(PdfProcessorService.name);
  constructor(private readonly glm45Service: Glm45Service) {}

  async extrairTextoDoPdf(caminhoArquivo: string): Promise<string> {
    try {
      this.logger.log(`Iniciando extração de texto do PDF: ${caminhoArquivo}`);
      
      const pdfBuffer = await fs.readFile(caminhoArquivo);
      const pdfData = await pdfParse(pdfBuffer);
      
      const texto = pdfData.text;
      
      if (!texto || texto.trim().length === 0) {
        throw new Error('PDF não contém texto extraível');
      }
      
      this.logger.log(`Texto extraído com sucesso. Tamanho: ${texto.length} caracteres`);
      return texto;
      
    } catch (error) {
      this.logger.error(`Erro ao extrair texto do PDF: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Falha ao extrair texto do PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  async gerarResumoComIA(texto: string): Promise<string> {
    try {
      this.logger.log('Iniciando geração de resumo com IA usando GLM-4.5...');
      const partes = this.dividirTextoEmPartes(texto, 4000);
      this.logger.log(`Dividindo texto em ${partes.length} partes para processamento`);
      const resumosParciais: string[] = [];
      for (let i = 0; i < partes.length; i++) {
        this.logger.log(`Processando parte ${i + 1}/${partes.length}`);
        const resumo = await this.glm45Service.gerarTextoEducativo({
          systemPrompt: 'Você é um especialista em educação. Gere um resumo didático e detalhado do texto abaixo.',
          userPrompt: partes[i],
          maxTokens: 300,
          temperature: 0.7,
          thinking: true,
        });
        if (resumo) {
          resumosParciais.push(resumo);
        }
      }
      let resumoFinal = '';
      if (resumosParciais.length === 1) {
        resumoFinal = resumosParciais[0];
      } else if (resumosParciais.length > 1) {
        this.logger.log('Gerando resumo final combinando resumos parciais...');
        resumoFinal = await this.glm45Service.gerarTextoEducativo({
          systemPrompt: 'Combine e resuma didaticamente os textos abaixo em um único resumo detalhado.',
          userPrompt: resumosParciais.join(' '),
          maxTokens: 300,
          temperature: 0.7,
          thinking: true,
        });
      }
      this.logger.log('Resumo gerado com sucesso');
      return resumoFinal || 'Resumo não disponível';
    } catch (error) {
      this.logger.error(`Erro ao gerar resumo com IA: ${error instanceof Error ? error.message : String(error)}`);
      return 'Erro ao gerar resumo com IA.';
    }
  }


  private dividirTextoEmPartes(texto: string, limiteTokens: number): string[] {
    const paragrafos = texto.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    const partes: string[] = [];
    let parteAtual = '';

    for (const paragrafo of paragrafos) {
      if ((parteAtual + paragrafo).length > limiteTokens && parteAtual.length > 0) {
        partes.push(parteAtual.trim());
        parteAtual = paragrafo;
      } else {
        parteAtual += (parteAtual ? '\n\n' : '') + paragrafo;
      }
    }

    if (parteAtual.trim().length > 0) {
      partes.push(parteAtual.trim());
    }

    return partes.length > 0 ? partes : [texto];
  }

  async chamarAPIHuggingFace(modelo: string, texto: string): Promise<string> {
    try {
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      const parametros = {
        inputs: texto,
        parameters: {
          max_length: 2048,
          min_length: 400,
          do_sample: false
        }
      };
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${modelo}`,
        parametros,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000, 
        },
      );

      if (Array.isArray(response.data)) {
        return response.data[0]?.summary_text || '';
      }

      if (response.data?.error) {
        this.logger.error(`Erro da API HuggingFace: ${response.data.error}`);
        return '';
      }

      return response.data?.summary_text || '';

    } catch (error) {
      this.logger.error(`Erro ao chamar API HuggingFace: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }


  async validarPdf(caminhoArquivo: string): Promise<boolean> {
    try {
      const pdfBuffer = await fs.readFile(caminhoArquivo);
      const pdfData = await pdfParse(pdfBuffer);
      
      return Boolean(pdfData.text && pdfData.text.trim().length > 0);
    } catch (error) {
      this.logger.error(`Erro ao validar PDF: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
} 