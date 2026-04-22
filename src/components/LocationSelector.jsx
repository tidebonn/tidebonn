import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const COUNTRIES = [
  'Norge', 'Sverige', 'Danmark', 'Finland', 'Island',
  'USA', 'Storbritannia', 'Tyskland', 'Frankrike', 'Spania',
  'Italia', 'Nederland', 'Belgia', 'Sveits', 'Østerrike',
  'Polen', 'Tsjekkia', 'Ungarn', 'Portugal', 'Hellas',
  'Australia', 'New Zealand', 'Canada', 'Japan', 'Kina',
  'India', 'Brasil', 'Mexico', 'Argentina', 'Chile',
];

const NORWEGIAN_POSTAL_CODES = [
  // Oslo (0000-0999)
  { code: '0001', city: 'Oslo' }, { code: '0010', city: 'Oslo' }, { code: '0015', city: 'Oslo' }, { code: '0018', city: 'Oslo' }, { code: '0021', city: 'Oslo' },
  { code: '0024', city: 'Oslo' }, { code: '0025', city: 'Oslo' }, { code: '0026', city: 'Oslo' }, { code: '0028', city: 'Oslo' }, { code: '0030', city: 'Oslo' },
  { code: '0031', city: 'Oslo' }, { code: '0032', city: 'Oslo' }, { code: '0033', city: 'Oslo' }, { code: '0034', city: 'Oslo' }, { code: '0037', city: 'Oslo' },
  { code: '0040', city: 'Oslo' }, { code: '0042', city: 'Oslo' }, { code: '0045', city: 'Oslo' }, { code: '0046', city: 'Oslo' }, { code: '0047', city: 'Oslo' },
  { code: '0048', city: 'Oslo' }, { code: '0050', city: 'Oslo' }, { code: '0051', city: 'Oslo' }, { code: '0055', city: 'Oslo' }, { code: '0101', city: 'Oslo' },
  { code: '0102', city: 'Oslo' }, { code: '0103', city: 'Oslo' }, { code: '0104', city: 'Oslo' }, { code: '0105', city: 'Oslo' }, { code: '0106', city: 'Oslo' },
  { code: '0107', city: 'Oslo' }, { code: '0109', city: 'Oslo' }, { code: '0110', city: 'Oslo' }, { code: '0111', city: 'Oslo' }, { code: '0112', city: 'Oslo' },
  { code: '0113', city: 'Oslo' }, { code: '0114', city: 'Oslo' }, { code: '0115', city: 'Oslo' }, { code: '0116', city: 'Oslo' }, { code: '0117', city: 'Oslo' },
  { code: '0118', city: 'Oslo' }, { code: '0119', city: 'Oslo' }, { code: '0120', city: 'Oslo' }, { code: '0121', city: 'Oslo' }, { code: '0122', city: 'Oslo' },
  { code: '0123', city: 'Oslo' }, { code: '0124', city: 'Oslo' }, { code: '0125', city: 'Oslo' }, { code: '0128', city: 'Oslo' }, { code: '0129', city: 'Oslo' },
  { code: '0130', city: 'Oslo' }, { code: '0131', city: 'Oslo' }, { code: '0133', city: 'Oslo' }, { code: '0134', city: 'Oslo' }, { code: '0135', city: 'Oslo' },
  { code: '0136', city: 'Oslo' }, { code: '0137', city: 'Oslo' }, { code: '0138', city: 'Oslo' }, { code: '0139', city: 'Oslo' }, { code: '0150', city: 'Oslo' },
  { code: '0151', city: 'Oslo' }, { code: '0152', city: 'Oslo' }, { code: '0153', city: 'Oslo' }, { code: '0154', city: 'Oslo' }, { code: '0155', city: 'Oslo' },
  { code: '0157', city: 'Oslo' }, { code: '0158', city: 'Oslo' }, { code: '0159', city: 'Oslo' }, { code: '0160', city: 'Oslo' }, { code: '0161', city: 'Oslo' },
  { code: '0162', city: 'Oslo' }, { code: '0164', city: 'Oslo' }, { code: '0165', city: 'Oslo' }, { code: '0166', city: 'Oslo' }, { code: '0167', city: 'Oslo' },
  { code: '0168', city: 'Oslo' }, { code: '0169', city: 'Oslo' }, { code: '0170', city: 'Oslo' }, { code: '0171', city: 'Oslo' }, { code: '0172', city: 'Oslo' },
  { code: '0173', city: 'Oslo' }, { code: '0174', city: 'Oslo' }, { code: '0175', city: 'Oslo' }, { code: '0176', city: 'Oslo' }, { code: '0177', city: 'Oslo' },
  { code: '0178', city: 'Oslo' }, { code: '0179', city: 'Oslo' }, { code: '0180', city: 'Oslo' }, { code: '0181', city: 'Oslo' }, { code: '0182', city: 'Oslo' },
  { code: '0183', city: 'Oslo' }, { code: '0184', city: 'Oslo' }, { code: '0185', city: 'Oslo' }, { code: '0186', city: 'Oslo' }, { code: '0187', city: 'Oslo' },
  { code: '0188', city: 'Oslo' }, { code: '0190', city: 'Oslo' }, { code: '0191', city: 'Oslo' }, { code: '0192', city: 'Oslo' }, { code: '0193', city: 'Oslo' },
  { code: '0194', city: 'Oslo' }, { code: '0195', city: 'Oslo' }, { code: '0196', city: 'Oslo' }, { code: '0198', city: 'Oslo' }, { code: '0201', city: 'Oslo' },
  { code: '0202', city: 'Oslo' }, { code: '0203', city: 'Oslo' }, { code: '0207', city: 'Oslo' }, { code: '0208', city: 'Oslo' }, { code: '0211', city: 'Oslo' },
  { code: '0212', city: 'Oslo' }, { code: '0213', city: 'Oslo' }, { code: '0214', city: 'Oslo' }, { code: '0215', city: 'Oslo' }, { code: '0216', city: 'Oslo' },
  { code: '0217', city: 'Oslo' }, { code: '0218', city: 'Oslo' }, { code: '0230', city: 'Oslo' }, { code: '0240', city: 'Oslo' }, { code: '0244', city: 'Oslo' },
  { code: '0250', city: 'Oslo' }, { code: '0251', city: 'Oslo' }, { code: '0252', city: 'Oslo' }, { code: '0253', city: 'Oslo' }, { code: '0254', city: 'Oslo' },
  { code: '0255', city: 'Oslo' }, { code: '0256', city: 'Oslo' }, { code: '0257', city: 'Oslo' }, { code: '0258', city: 'Oslo' }, { code: '0259', city: 'Oslo' },
  { code: '0260', city: 'Oslo' }, { code: '0262', city: 'Oslo' }, { code: '0263', city: 'Oslo' }, { code: '0264', city: 'Oslo' }, { code: '0265', city: 'Oslo' },
  { code: '0266', city: 'Oslo' }, { code: '0267', city: 'Oslo' }, { code: '0268', city: 'Oslo' }, { code: '0270', city: 'Oslo' }, { code: '0271', city: 'Oslo' },
  { code: '0272', city: 'Oslo' }, { code: '0273', city: 'Oslo' }, { code: '0274', city: 'Oslo' }, { code: '0275', city: 'Oslo' }, { code: '0276', city: 'Oslo' },
  { code: '0277', city: 'Oslo' }, { code: '0278', city: 'Oslo' }, { code: '0279', city: 'Oslo' }, { code: '0280', city: 'Oslo' }, { code: '0281', city: 'Oslo' },
  { code: '0282', city: 'Oslo' }, { code: '0283', city: 'Oslo' }, { code: '0284', city: 'Oslo' }, { code: '0286', city: 'Oslo' }, { code: '0287', city: 'Oslo' },
  { code: '0301', city: 'Oslo' }, { code: '0302', city: 'Oslo' }, { code: '0303', city: 'Oslo' }, { code: '0304', city: 'Oslo' }, { code: '0305', city: 'Oslo' },
  { code: '0306', city: 'Oslo' }, { code: '0307', city: 'Oslo' }, { code: '0308', city: 'Oslo' }, { code: '0309', city: 'Oslo' }, { code: '0310', city: 'Oslo' },
  { code: '0311', city: 'Oslo' }, { code: '0313', city: 'Oslo' }, { code: '0314', city: 'Oslo' }, { code: '0315', city: 'Oslo' }, { code: '0316', city: 'Oslo' },
  { code: '0317', city: 'Oslo' }, { code: '0318', city: 'Oslo' }, { code: '0319', city: 'Oslo' }, { code: '0330', city: 'Oslo' }, { code: '0340', city: 'Oslo' },
  { code: '0349', city: 'Oslo' }, { code: '0350', city: 'Oslo' }, { code: '0351', city: 'Oslo' }, { code: '0352', city: 'Oslo' }, { code: '0353', city: 'Oslo' },
  { code: '0354', city: 'Oslo' }, { code: '0355', city: 'Oslo' }, { code: '0356', city: 'Oslo' }, { code: '0357', city: 'Oslo' }, { code: '0358', city: 'Oslo' },
  { code: '0359', city: 'Oslo' }, { code: '0360', city: 'Oslo' }, { code: '0361', city: 'Oslo' }, { code: '0362', city: 'Oslo' }, { code: '0363', city: 'Oslo' },
  { code: '0364', city: 'Oslo' }, { code: '0365', city: 'Oslo' }, { code: '0366', city: 'Oslo' }, { code: '0367', city: 'Oslo' }, { code: '0368', city: 'Oslo' },
  { code: '0369', city: 'Oslo' }, { code: '0370', city: 'Oslo' }, { code: '0371', city: 'Oslo' }, { code: '0372', city: 'Oslo' }, { code: '0373', city: 'Oslo' },
  { code: '0374', city: 'Oslo' }, { code: '0375', city: 'Oslo' }, { code: '0376', city: 'Oslo' }, { code: '0377', city: 'Oslo' }, { code: '0378', city: 'Oslo' },
  { code: '0379', city: 'Oslo' }, { code: '0380', city: 'Oslo' }, { code: '0381', city: 'Oslo' }, { code: '0382', city: 'Oslo' }, { code: '0383', city: 'Oslo' },
  { code: '0401', city: 'Oslo' }, { code: '0402', city: 'Oslo' }, { code: '0403', city: 'Oslo' }, { code: '0404', city: 'Oslo' }, { code: '0405', city: 'Oslo' },
  { code: '0406', city: 'Oslo' }, { code: '0407', city: 'Oslo' }, { code: '0408', city: 'Oslo' }, { code: '0409', city: 'Oslo' }, { code: '0410', city: 'Oslo' },
  { code: '0440', city: 'Oslo' }, { code: '0441', city: 'Oslo' }, { code: '0442', city: 'Oslo' }, { code: '0443', city: 'Oslo' }, { code: '0445', city: 'Oslo' },
  { code: '0450', city: 'Oslo' }, { code: '0451', city: 'Oslo' }, { code: '0452', city: 'Oslo' }, { code: '0454', city: 'Oslo' }, { code: '0455', city: 'Oslo' },
  { code: '0456', city: 'Oslo' }, { code: '0457', city: 'Oslo' }, { code: '0458', city: 'Oslo' }, { code: '0459', city: 'Oslo' }, { code: '0460', city: 'Oslo' },
  { code: '0461', city: 'Oslo' }, { code: '0462', city: 'Oslo' }, { code: '0463', city: 'Oslo' }, { code: '0464', city: 'Oslo' }, { code: '0465', city: 'Oslo' },
  { code: '0467', city: 'Oslo' }, { code: '0468', city: 'Oslo' }, { code: '0469', city: 'Oslo' }, { code: '0470', city: 'Oslo' }, { code: '0472', city: 'Oslo' },
  { code: '0473', city: 'Oslo' }, { code: '0474', city: 'Oslo' }, { code: '0475', city: 'Oslo' }, { code: '0476', city: 'Oslo' }, { code: '0477', city: 'Oslo' },
  { code: '0478', city: 'Oslo' }, { code: '0479', city: 'Oslo' }, { code: '0480', city: 'Oslo' }, { code: '0481', city: 'Oslo' }, { code: '0482', city: 'Oslo' },
  { code: '0483', city: 'Oslo' }, { code: '0484', city: 'Oslo' }, { code: '0485', city: 'Oslo' }, { code: '0486', city: 'Oslo' }, { code: '0487', city: 'Oslo' },
  { code: '0488', city: 'Oslo' }, { code: '0489', city: 'Oslo' }, { code: '0490', city: 'Oslo' }, { code: '0491', city: 'Oslo' }, { code: '0492', city: 'Oslo' },
  { code: '0493', city: 'Oslo' }, { code: '0494', city: 'Oslo' }, { code: '0495', city: 'Oslo' }, { code: '0496', city: 'Oslo' }, { code: '0497', city: 'Oslo' },
  { code: '0501', city: 'Oslo' }, { code: '0502', city: 'Oslo' }, { code: '0503', city: 'Oslo' }, { code: '0504', city: 'Oslo' }, { code: '0505', city: 'Oslo' },
  { code: '0506', city: 'Oslo' }, { code: '0507', city: 'Oslo' }, { code: '0508', city: 'Oslo' }, { code: '0509', city: 'Oslo' }, { code: '0510', city: 'Oslo' },
  { code: '0511', city: 'Oslo' }, { code: '0512', city: 'Oslo' }, { code: '0513', city: 'Oslo' }, { code: '0514', city: 'Oslo' }, { code: '0515', city: 'Oslo' },
  { code: '0516', city: 'Oslo' }, { code: '0517', city: 'Oslo' }, { code: '0518', city: 'Oslo' }, { code: '0520', city: 'Oslo' }, { code: '0540', city: 'Oslo' },
  { code: '0550', city: 'Oslo' }, { code: '0551', city: 'Oslo' }, { code: '0552', city: 'Oslo' }, { code: '0553', city: 'Oslo' }, { code: '0554', city: 'Oslo' },
  { code: '0555', city: 'Oslo' }, { code: '0556', city: 'Oslo' }, { code: '0557', city: 'Oslo' }, { code: '0558', city: 'Oslo' }, { code: '0559', city: 'Oslo' },
  { code: '0560', city: 'Oslo' }, { code: '0561', city: 'Oslo' }, { code: '0562', city: 'Oslo' }, { code: '0563', city: 'Oslo' }, { code: '0564', city: 'Oslo' },
  { code: '0565', city: 'Oslo' }, { code: '0566', city: 'Oslo' }, { code: '0567', city: 'Oslo' }, { code: '0568', city: 'Oslo' }, { code: '0569', city: 'Oslo' },
  { code: '0570', city: 'Oslo' }, { code: '0571', city: 'Oslo' }, { code: '0572', city: 'Oslo' }, { code: '0573', city: 'Oslo' }, { code: '0574', city: 'Oslo' },
  { code: '0575', city: 'Oslo' }, { code: '0576', city: 'Oslo' }, { code: '0577', city: 'Oslo' }, { code: '0578', city: 'Oslo' }, { code: '0579', city: 'Oslo' },
  { code: '0580', city: 'Oslo' }, { code: '0581', city: 'Oslo' }, { code: '0582', city: 'Oslo' }, { code: '0583', city: 'Oslo' }, { code: '0584', city: 'Oslo' },
  { code: '0585', city: 'Oslo' }, { code: '0586', city: 'Oslo' }, { code: '0587', city: 'Oslo' }, { code: '0588', city: 'Oslo' }, { code: '0589', city: 'Oslo' },
  { code: '0590', city: 'Oslo' }, { code: '0591', city: 'Oslo' }, { code: '0592', city: 'Oslo' }, { code: '0593', city: 'Oslo' }, { code: '0594', city: 'Oslo' },
  { code: '0595', city: 'Oslo' }, { code: '0596', city: 'Oslo' }, { code: '0597', city: 'Oslo' }, { code: '0598', city: 'Oslo' }, { code: '0601', city: 'Oslo' },
  { code: '0602', city: 'Oslo' }, { code: '0603', city: 'Oslo' }, { code: '0604', city: 'Oslo' }, { code: '0605', city: 'Oslo' }, { code: '0606', city: 'Oslo' },
  { code: '0607', city: 'Oslo' }, { code: '0608', city: 'Oslo' }, { code: '0609', city: 'Oslo' }, { code: '0610', city: 'Oslo' }, { code: '0611', city: 'Oslo' },
  { code: '0612', city: 'Oslo' }, { code: '0613', city: 'Oslo' }, { code: '0614', city: 'Oslo' }, { code: '0615', city: 'Oslo' }, { code: '0616', city: 'Oslo' },
  { code: '0617', city: 'Oslo' }, { code: '0618', city: 'Oslo' }, { code: '0619', city: 'Oslo' }, { code: '0620', city: 'Oslo' }, { code: '0621', city: 'Oslo' },
  { code: '0622', city: 'Oslo' }, { code: '0623', city: 'Oslo' }, { code: '0624', city: 'Oslo' }, { code: '0626', city: 'Oslo' }, { code: '0640', city: 'Oslo' },
  { code: '0650', city: 'Oslo' }, { code: '0651', city: 'Oslo' }, { code: '0652', city: 'Oslo' }, { code: '0653', city: 'Oslo' }, { code: '0654', city: 'Oslo' },
  { code: '0655', city: 'Oslo' }, { code: '0656', city: 'Oslo' }, { code: '0657', city: 'Oslo' }, { code: '0658', city: 'Oslo' }, { code: '0659', city: 'Oslo' },
  { code: '0660', city: 'Oslo' }, { code: '0661', city: 'Oslo' }, { code: '0662', city: 'Oslo' }, { code: '0663', city: 'Oslo' }, { code: '0664', city: 'Oslo' },
  { code: '0665', city: 'Oslo' }, { code: '0666', city: 'Oslo' }, { code: '0667', city: 'Oslo' }, { code: '0668', city: 'Oslo' }, { code: '0669', city: 'Oslo' },
  { code: '0670', city: 'Oslo' }, { code: '0671', city: 'Oslo' }, { code: '0672', city: 'Oslo' }, { code: '0673', city: 'Oslo' }, { code: '0674', city: 'Oslo' },
  { code: '0675', city: 'Oslo' }, { code: '0676', city: 'Oslo' }, { code: '0677', city: 'Oslo' }, { code: '0678', city: 'Oslo' }, { code: '0679', city: 'Oslo' },
  { code: '0680', city: 'Oslo' }, { code: '0681', city: 'Oslo' }, { code: '0682', city: 'Oslo' }, { code: '0683', city: 'Oslo' }, { code: '0684', city: 'Oslo' },
  { code: '0685', city: 'Oslo' }, { code: '0686', city: 'Oslo' }, { code: '0687', city: 'Oslo' }, { code: '0688', city: 'Oslo' }, { code: '0689', city: 'Oslo' },
  { code: '0690', city: 'Oslo' }, { code: '0691', city: 'Oslo' }, { code: '0692', city: 'Oslo' }, { code: '0693', city: 'Oslo' }, { code: '0694', city: 'Oslo' },
  { code: '0701', city: 'Oslo' }, { code: '0710', city: 'Oslo' }, { code: '0712', city: 'Oslo' }, { code: '0750', city: 'Oslo' }, { code: '0751', city: 'Oslo' },
  { code: '0752', city: 'Oslo' }, { code: '0753', city: 'Oslo' }, { code: '0754', city: 'Oslo' }, { code: '0755', city: 'Oslo' }, { code: '0756', city: 'Oslo' },
  { code: '0757', city: 'Oslo' }, { code: '0758', city: 'Oslo' }, { code: '0760', city: 'Oslo' }, { code: '0763', city: 'Oslo' }, { code: '0764', city: 'Oslo' },
  { code: '0765', city: 'Oslo' }, { code: '0766', city: 'Oslo' }, { code: '0767', city: 'Oslo' }, { code: '0768', city: 'Oslo' }, { code: '0770', city: 'Oslo' },
  { code: '0771', city: 'Oslo' }, { code: '0772', city: 'Oslo' }, { code: '0773', city: 'Oslo' }, { code: '0774', city: 'Oslo' }, { code: '0775', city: 'Oslo' },
  { code: '0776', city: 'Oslo' }, { code: '0777', city: 'Oslo' }, { code: '0778', city: 'Oslo' }, { code: '0779', city: 'Oslo' }, { code: '0781', city: 'Oslo' },
  { code: '0782', city: 'Oslo' }, { code: '0783', city: 'Oslo' }, { code: '0784', city: 'Oslo' }, { code: '0785', city: 'Oslo' }, { code: '0786', city: 'Oslo' },
  { code: '0787', city: 'Oslo' }, { code: '0788', city: 'Oslo' }, { code: '0789', city: 'Oslo' }, { code: '0790', city: 'Oslo' }, { code: '0791', city: 'Oslo' },
  { code: '0801', city: 'Oslo' }, { code: '0805', city: 'Oslo' }, { code: '0840', city: 'Oslo' }, { code: '0850', city: 'Oslo' }, { code: '0851', city: 'Oslo' },
  { code: '0852', city: 'Oslo' }, { code: '0853', city: 'Oslo' }, { code: '0854', city: 'Oslo' }, { code: '0855', city: 'Oslo' }, { code: '0862', city: 'Oslo' },
  { code: '0863', city: 'Oslo' }, { code: '0864', city: 'Oslo' }, { code: '0870', city: 'Oslo' }, { code: '0871', city: 'Oslo' }, { code: '0872', city: 'Oslo' },
  { code: '0873', city: 'Oslo' }, { code: '0874', city: 'Oslo' }, { code: '0875', city: 'Oslo' }, { code: '0876', city: 'Oslo' }, { code: '0877', city: 'Oslo' },
  { code: '0880', city: 'Oslo' }, { code: '0881', city: 'Oslo' }, { code: '0882', city: 'Oslo' }, { code: '0883', city: 'Oslo' }, { code: '0884', city: 'Oslo' },
  { code: '0890', city: 'Oslo' }, { code: '0891', city: 'Oslo' }, { code: '0902', city: 'Oslo' }, { code: '0950', city: 'Oslo' }, { code: '0951', city: 'Oslo' },
  { code: '0952', city: 'Oslo' }, { code: '0953', city: 'Oslo' }, { code: '0954', city: 'Oslo' }, { code: '0955', city: 'Oslo' }, { code: '0956', city: 'Oslo' },
  { code: '0957', city: 'Oslo' }, { code: '0958', city: 'Oslo' }, { code: '0959', city: 'Oslo' }, { code: '0960', city: 'Oslo' }, { code: '0962', city: 'Oslo' },
  { code: '0963', city: 'Oslo' }, { code: '0964', city: 'Oslo' }, { code: '0970', city: 'Oslo' }, { code: '0971', city: 'Oslo' }, { code: '0972', city: 'Oslo' },
  { code: '0973', city: 'Oslo' }, { code: '0975', city: 'Oslo' }, { code: '0976', city: 'Oslo' }, { code: '0977', city: 'Oslo' }, { code: '0978', city: 'Oslo' },
  { code: '0979', city: 'Oslo' }, { code: '0980', city: 'Oslo' }, { code: '0981', city: 'Oslo' }, { code: '0982', city: 'Oslo' }, { code: '0983', city: 'Oslo' },
  { code: '0984', city: 'Oslo' }, { code: '0985', city: 'Oslo' }, { code: '0986', city: 'Oslo' },
  // Bergen
  { code: '5003', city: 'Bergen' }, { code: '5004', city: 'Bergen' }, { code: '5005', city: 'Bergen' }, { code: '5006', city: 'Bergen' },
  { code: '5007', city: 'Bergen' }, { code: '5008', city: 'Bergen' }, { code: '5009', city: 'Bergen' }, { code: '5014', city: 'Bergen' },
  { code: '5015', city: 'Bergen' }, { code: '5018', city: 'Bergen' }, { code: '5020', city: 'Bergen' }, { code: '5031', city: 'Bergen' },
  { code: '5032', city: 'Bergen' }, { code: '5033', city: 'Bergen' }, { code: '5034', city: 'Bergen' }, { code: '5035', city: 'Bergen' },
  { code: '5036', city: 'Bergen' }, { code: '5037', city: 'Bergen' }, { code: '5038', city: 'Bergen' }, { code: '5039', city: 'Bergen' },
  { code: '5041', city: 'Bergen' }, { code: '5042', city: 'Bergen' }, { code: '5043', city: 'Bergen' }, { code: '5045', city: 'Bergen' },
  { code: '5052', city: 'Bergen' }, { code: '5053', city: 'Bergen' }, { code: '5054', city: 'Bergen' }, { code: '5055', city: 'Bergen' },
  { code: '5056', city: 'Bergen' }, { code: '5057', city: 'Bergen' }, { code: '5058', city: 'Bergen' }, { code: '5059', city: 'Bergen' },
  { code: '5063', city: 'Bergen' }, { code: '5068', city: 'Bergen' }, { code: '5072', city: 'Bergen' }, { code: '5073', city: 'Bergen' },
  { code: '5075', city: 'Bergen' }, { code: '5081', city: 'Bergen' }, { code: '5089', city: 'Bergen' },
  // Trondheim
  { code: '7010', city: 'Trondheim' }, { code: '7011', city: 'Trondheim' }, { code: '7012', city: 'Trondheim' }, { code: '7013', city: 'Trondheim' },
  { code: '7014', city: 'Trondheim' }, { code: '7018', city: 'Trondheim' }, { code: '7019', city: 'Trondheim' }, { code: '7020', city: 'Trondheim' },
  { code: '7021', city: 'Trondheim' }, { code: '7022', city: 'Trondheim' }, { code: '7030', city: 'Trondheim' }, { code: '7031', city: 'Trondheim' },
  { code: '7032', city: 'Trondheim' }, { code: '7033', city: 'Trondheim' }, { code: '7034', city: 'Trondheim' }, { code: '7036', city: 'Trondheim' },
  { code: '7037', city: 'Trondheim' }, { code: '7038', city: 'Trondheim' }, { code: '7040', city: 'Trondheim' }, { code: '7041', city: 'Trondheim' },
  { code: '7042', city: 'Trondheim' }, { code: '7043', city: 'Trondheim' }, { code: '7044', city: 'Trondheim' }, { code: '7045', city: 'Trondheim' },
  { code: '7046', city: 'Trondheim' }, { code: '7048', city: 'Trondheim' }, { code: '7049', city: 'Trondheim' }, { code: '7050', city: 'Trondheim' },
  // Stavanger
  { code: '4001', city: 'Stavanger' }, { code: '4002', city: 'Stavanger' }, { code: '4003', city: 'Stavanger' }, { code: '4004', city: 'Stavanger' },
  { code: '4005', city: 'Stavanger' }, { code: '4006', city: 'Stavanger' }, { code: '4007', city: 'Stavanger' }, { code: '4009', city: 'Stavanger' },
  { code: '4010', city: 'Stavanger' }, { code: '4011', city: 'Stavanger' }, { code: '4012', city: 'Stavanger' }, { code: '4014', city: 'Stavanger' },
  { code: '4015', city: 'Stavanger' }, { code: '4016', city: 'Stavanger' }, { code: '4017', city: 'Stavanger' }, { code: '4020', city: 'Stavanger' },
  { code: '4021', city: 'Stavanger' }, { code: '4040', city: 'Stavanger' }, { code: '4041', city: 'Stavanger' }, { code: '4042', city: 'Stavanger' },
  { code: '4043', city: 'Stavanger' }, { code: '4044', city: 'Stavanger' }, { code: '4050', city: 'Stavanger' }, { code: '4051', city: 'Stavanger' },
  { code: '4064', city: 'Stavanger' }, { code: '4068', city: 'Stavanger' },
  // Andre byer
  { code: '4612', city: 'Kristiansand' }, { code: '4614', city: 'Kristiansand' }, { code: '4616', city: 'Kristiansand' },
  { code: '4618', city: 'Kristiansand' }, { code: '4623', city: 'Kristiansand' }, { code: '4630', city: 'Kristiansand' },
  { code: '4632', city: 'Kristiansand' }, { code: '4634', city: 'Kristiansand' }, { code: '4636', city: 'Kristiansand' },
  { code: '1601', city: 'Fredrikstad' }, { code: '1606', city: 'Fredrikstad' }, { code: '1607', city: 'Fredrikstad' },
  { code: '1610', city: 'Fredrikstad' }, { code: '1612', city: 'Fredrikstad' }, { code: '1613', city: 'Fredrikstad' },
  { code: '4301', city: 'Sandnes' }, { code: '4302', city: 'Sandnes' }, { code: '4303', city: 'Sandnes' },
  { code: '4305', city: 'Sandnes' }, { code: '4306', city: 'Sandnes' }, { code: '4307', city: 'Sandnes' },
  { code: '9001', city: 'Tromsø' }, { code: '9002', city: 'Tromsø' }, { code: '9006', city: 'Tromsø' },
  { code: '9007', city: 'Tromsø' }, { code: '9009', city: 'Tromsø' }, { code: '9010', city: 'Tromsø' },
  { code: '9011', city: 'Tromsø' }, { code: '9016', city: 'Tromsø' }, { code: '9019', city: 'Tromsø' },
  { code: '3001', city: 'Drammen' }, { code: '3002', city: 'Drammen' }, { code: '3003', city: 'Drammen' },
  { code: '3004', city: 'Drammen' }, { code: '3005', city: 'Drammen' }, { code: '3011', city: 'Drammen' },
  { code: '3012', city: 'Drammen' }, { code: '3015', city: 'Drammen' }, { code: '3017', city: 'Drammen' },
  { code: '3018', city: 'Drammen' }, { code: '3019', city: 'Drammen' }, { code: '3020', city: 'Drammen' },
];

export function CountrySelector({ value, onValueChange, onBlur }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-[#E8E0D8] dark:border-gray-700 bg-white dark:bg-[#1A1A1A]"
        >
          {value || "Velg land..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Søk etter land..." />
          <CommandList>
            <CommandEmpty>Ingen land funnet.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country}
                  value={country}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    onBlur?.();
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {country}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function PostalCodeSelector({ value, onValueChange, onBlur, country }) {
  return (
    <Button
      variant="outline"
      className="w-full justify-between border-[#E8E0D8] dark:border-gray-700 bg-white dark:bg-[#1A1A1A] cursor-text"
      onClick={(e) => e.preventDefault()}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={onBlur}
        placeholder={country === 'Norge' ? "Postnummer og sted..." : "Sted..."}
        className="w-full bg-transparent outline-none"
      />
    </Button>
  );
}