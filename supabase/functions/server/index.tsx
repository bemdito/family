import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Criar cliente Supabase com service_role para operações completas
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Enable CORS
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: false,
}));

// =====================================================
// HEALTH CHECK
// =====================================================
app.get("/make-server-055bf375/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// =====================================================
// PESSOAS - CRUD
// =====================================================

// Listar todas as pessoas
app.get("/make-server-055bf375/pessoas", async (c) => {
  try {
    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .order('nome_completo', { ascending: true });

    if (error) {
      console.error('Erro ao listar pessoas:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Obter pessoa por ID
app.get("/make-server-055bf375/pessoas/:id", async (c) => {
  try {
    const id = c.req.param('id');
    
    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao obter pessoa:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao obter pessoa:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Criar nova pessoa
app.post("/make-server-055bf375/pessoas", async (c) => {
  try {
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('pessoas')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar pessoa:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao criar pessoa:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Atualizar pessoa
app.put("/make-server-055bf375/pessoas/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('pessoas')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar pessoa:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao atualizar pessoa:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Deletar pessoa
app.delete("/make-server-055bf375/pessoas/:id", async (c) => {
  try {
    const id = c.req.param('id');
    
    // Primeiro, deletar relacionamentos
    await supabase
      .from('relacionamentos')
      .delete()
      .or(`pessoa_origem_id.eq.${id},pessoa_destino_id.eq.${id}`);
    
    // Depois, deletar a pessoa
    const { error } = await supabase
      .from('pessoas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar pessoa:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar pessoa:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// =====================================================
// RELACIONAMENTOS - CRUD
// =====================================================

// Listar todos os relacionamentos
app.get("/make-server-055bf375/relacionamentos", async (c) => {
  try {
    const { data, error } = await supabase
      .from('relacionamentos')
      .select('*');

    if (error) {
      console.error('Erro ao listar relacionamentos:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao listar relacionamentos:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Obter relacionamentos de uma pessoa
app.get("/make-server-055bf375/pessoas/:id/relacionamentos", async (c) => {
  try {
    const id = c.req.param('id');
    
    const { data, error } = await supabase
      .from('relacionamentos')
      .select('*')
      .or(`pessoa_origem_id.eq.${id},pessoa_destino_id.eq.${id}`);

    if (error) {
      console.error('Erro ao obter relacionamentos:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao obter relacionamentos:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Criar relacionamento
app.post("/make-server-055bf375/relacionamentos", async (c) => {
  try {
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('relacionamentos')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar relacionamento:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao criar relacionamento:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Atualizar relacionamento
app.put("/make-server-055bf375/relacionamentos/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('relacionamentos')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar relacionamento:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao atualizar relacionamento:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Deletar relacionamento
app.delete("/make-server-055bf375/relacionamentos/:id", async (c) => {
  try {
    const id = c.req.param('id');
    
    const { error } = await supabase
      .from('relacionamentos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar relacionamento:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar relacionamento:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// =====================================================
// MIGRAÇÃO DE DADOS
// =====================================================

app.post("/make-server-055bf375/migrar-dados", async (c) => {
  try {
    const { seed } = await c.req.json();

    if (!Array.isArray(seed) || seed.length === 0) {
      return c.json({ success: false, error: 'Dados do seed inválidos' }, 400);
    }

    // Limpar dados existentes
    await supabase.from('relacionamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pessoas').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Mapear nome completo -> UUID
    const nomeParaId = new Map<string, string>();

    // 1. Criar todas as pessoas primeiro
    for (const registro of seed) {
      const pessoa = {
        nome_completo: registro['Nome completo'],
        data_nascimento: registro['Data de nascimento']?.toString() || null,
        local_nascimento: registro['Local de Nascimento'] || null,
        data_falecimento: registro['Data de falecimento']?.toString() || null,
        local_falecimento: registro['Local de Falecimento'] || null,
        humano_ou_pet: registro['Humano ou pet'] || 'Humano',
      };

      const { data, error } = await supabase
        .from('pessoas')
        .insert([pessoa])
        .select()
        .single();

      if (error) {
        console.error(`Erro ao criar pessoa ${pessoa.nome_completo}:`, error);
        continue;
      }

      nomeParaId.set(pessoa.nome_completo, data.id);
    }

    // 2. Criar relacionamentos
    const relacionamentosCriados = [];
    const relacionamentosSet = new Set<string>();
    
    for (const registro of seed) {
      const nomeCompleto = registro['Nome completo'];
      const pessoaId = nomeParaId.get(nomeCompleto);
      
      if (!pessoaId) continue;

      const pai = registro['Pai'];
      const mae = registro['Mãe'];
      const conjuge = registro['Cônjuge'];
      const tipoFiliacao = registro['Filho (a) de (de sangue; adotivo'] || 'Sangue';

      // Relacionamento com pai
      if (pai) {
        const paiId = nomeParaId.get(pai);
        if (paiId) {
          const key1 = `${pessoaId}-${paiId}-pai`;
          const key2 = `${paiId}-${pessoaId}-filho`;
          
          if (!relacionamentosSet.has(key1)) {
            await supabase.from('relacionamentos').insert({
              pessoa_origem_id: pessoaId,
              pessoa_destino_id: paiId,
              tipo_relacionamento: 'pai',
              subtipo_relacionamento: tipoFiliacao.toLowerCase(),
            });
            relacionamentosSet.add(key1);
            relacionamentosCriados.push(key1);
          }
          
          if (!relacionamentosSet.has(key2)) {
            await supabase.from('relacionamentos').insert({
              pessoa_origem_id: paiId,
              pessoa_destino_id: pessoaId,
              tipo_relacionamento: 'filho',
              subtipo_relacionamento: tipoFiliacao.toLowerCase(),
            });
            relacionamentosSet.add(key2);
            relacionamentosCriados.push(key2);
          }
        }
      }

      // Relacionamento com mãe
      if (mae) {
        const maeId = nomeParaId.get(mae);
        if (maeId) {
          const key1 = `${pessoaId}-${maeId}-mae`;
          const key2 = `${maeId}-${pessoaId}-filho`;
          
          if (!relacionamentosSet.has(key1)) {
            await supabase.from('relacionamentos').insert({
              pessoa_origem_id: pessoaId,
              pessoa_destino_id: maeId,
              tipo_relacionamento: 'mae',
              subtipo_relacionamento: tipoFiliacao.toLowerCase(),
            });
            relacionamentosSet.add(key1);
            relacionamentosCriados.push(key1);
          }
          
          if (!relacionamentosSet.has(key2)) {
            await supabase.from('relacionamentos').insert({
              pessoa_origem_id: maeId,
              pessoa_destino_id: pessoaId,
              tipo_relacionamento: 'filho',
              subtipo_relacionamento: tipoFiliacao.toLowerCase(),
            });
            relacionamentosSet.add(key2);
            relacionamentosCriados.push(key2);
          }
        }
      }

      // Relacionamento conjugal
      if (conjuge) {
        const conjugeId = nomeParaId.get(conjuge);
        if (conjugeId) {
          const key1 = `${pessoaId}-${conjugeId}-conjuge`;
          const key2 = `${conjugeId}-${pessoaId}-conjuge`;
          
          if (!relacionamentosSet.has(key1) && !relacionamentosSet.has(key2)) {
            await supabase.from('relacionamentos').insert({
              pessoa_origem_id: pessoaId,
              pessoa_destino_id: conjugeId,
              tipo_relacionamento: 'conjuge',
              subtipo_relacionamento: 'casamento',
            });
            relacionamentosSet.add(key1);
            relacionamentosCriados.push(key1);
            
            await supabase.from('relacionamentos').insert({
              pessoa_origem_id: conjugeId,
              pessoa_destino_id: pessoaId,
              tipo_relacionamento: 'conjuge',
              subtipo_relacionamento: 'casamento',
            });
            relacionamentosSet.add(key2);
            relacionamentosCriados.push(key2);
          }
        }
      }
    }

    // 3. Criar relacionamentos de irmãos
    const gruposPorPais = new Map<string, string[]>();
    
    for (const registro of seed) {
      const nomeCompleto = registro['Nome completo'];
      const pessoaId = nomeParaId.get(nomeCompleto);
      
      if (!pessoaId) continue;
      
      const pai = registro['Pai'];
      const mae = registro['Mãe'];
      const chaveGrupo = `${pai || 'sem-pai'}-${mae || 'sem-mae'}`;
      
      if (!gruposPorPais.has(chaveGrupo)) {
        gruposPorPais.set(chaveGrupo, []);
      }
      
      gruposPorPais.get(chaveGrupo)!.push(pessoaId);
    }
    
    for (const [chave, irmaos] of gruposPorPais.entries()) {
      if (irmaos.length < 2 || chave === 'sem-pai-sem-mae') continue;
      
      for (let i = 0; i < irmaos.length; i++) {
        for (let j = i + 1; j < irmaos.length; j++) {
          const key1 = `${irmaos[i]}-${irmaos[j]}-irmao`;
          const key2 = `${irmaos[j]}-${irmaos[i]}-irmao`;
          
          if (!relacionamentosSet.has(key1) && !relacionamentosSet.has(key2)) {
            await supabase.from('relacionamentos').insert({
              pessoa_origem_id: irmaos[i],
              pessoa_destino_id: irmaos[j],
              tipo_relacionamento: 'irmao',
              subtipo_relacionamento: 'sangue',
            });
            relacionamentosSet.add(key1);
            relacionamentosCriados.push(key1);
            
            await supabase.from('relacionamentos').insert({
              pessoa_origem_id: irmaos[j],
              pessoa_destino_id: irmaos[i],
              tipo_relacionamento: 'irmao',
              subtipo_relacionamento: 'sangue',
            });
            relacionamentosSet.add(key2);
            relacionamentosCriados.push(key2);
          }
        }
      }
    }

    return c.json({
      success: true,
      message: 'Migração concluída com sucesso!',
      stats: {
        pessoas: nomeParaId.size,
        relacionamentos: relacionamentosCriados.length,
      }
    });
  } catch (error) {
    console.error('Erro na migração:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// =====================================================
// ESTATÍSTICAS
// =====================================================

app.get("/make-server-055bf375/estatisticas", async (c) => {
  try {
    // Contar pessoas
    const { count: totalPessoas, error: pessoasError } = await supabase
      .from('pessoas')
      .select('*', { count: 'exact', head: true });

    if (pessoasError) throw pessoasError;

    // Contar pessoas vivas
    const { count: pessoasVivas, error: vivasError } = await supabase
      .from('pessoas')
      .select('*', { count: 'exact', head: true })
      .is('data_falecimento', null);

    if (vivasError) throw vivasError;

    // Contar relacionamentos
    const { count: totalRelacionamentos, error: relsError } = await supabase
      .from('relacionamentos')
      .select('*', { count: 'exact', head: true });

    if (relsError) throw relsError;

    return c.json({
      success: true,
      data: {
        totalPessoas: totalPessoas || 0,
        pessoasVivas: pessoasVivas || 0,
        pessoasFalecidas: (totalPessoas || 0) - (pessoasVivas || 0),
        totalRelacionamentos: totalRelacionamentos || 0,
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================

Deno.serve({
  onListen: ({ hostname, port }) => {
    console.log(`🚀 Servidor iniciado em http://${hostname}:${port}`);
  },
}, app.fetch);
