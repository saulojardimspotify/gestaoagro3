#!/usr/bin/env python3
"""Confere se index.html, a lista ARQUIVOS do sw.js e os arquivos no disco batem (ordem e existência)."""
import os, re, sys
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(raiz)
sw = open('sw.js', encoding='utf-8').read()
idx = open('index.html', encoding='utf-8').read()
bloco = sw[sw.index('const ARQUIVOS'):]
arquivos = re.findall(r'"\./([^"]+)"', bloco[:bloco.index('];')])
tags = re.findall(r'<script src="([^"]+)"', idx)
problemas = []
problemas += [f'listado no sw.js mas não existe: {a}' for a in arquivos if not os.path.exists(a)]
if [a for a in arquivos if a.endswith('.js')] != tags:
    problemas.append('ordem dos .js no sw.js diferente do index.html')
no_disco = [f'js/{p}/{f}' for p in ('app', 'modulos') for f in sorted(os.listdir(f'js/{p}')) if f.endswith('.js')]
problemas += [f'arquivo no disco fora do sw.js: {a}' for a in no_disco if a not in arquivos]
for linha in problemas: print('ERRO:', linha)
print('OK' if not problemas else f'{len(problemas)} problema(s)')
sys.exit(1 if problemas else 0)
