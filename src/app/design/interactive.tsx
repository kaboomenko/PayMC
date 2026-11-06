"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Segmented } from "@/components/ui/segmented";
import { Tooltip } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/components/ui/toaster";

export function DesignInteractive() {
  const [period, setPeriod] = React.useState<"7d" | "30d" | "90d">("30d");
  const [rev, setRev] = React.useState([150000]);
  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Интерактив</CardTitle>
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: "7d", label: "7 дн" },
              { value: "30d", label: "30 дн" },
              { value: "90d", label: "90 дн" },
            ]}
          />
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button>Открыть диалог</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Повторить выдачу?</DialogTitle>
                  <DialogDescription>Команды заказа #PMC-10482 будут отправлены на сервер «Выживание #1» ещё раз.</DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <p className="text-sm text-fg-2">Игрок сейчас онлайн — выдача займёт меньше секунды.</p>
                </DialogBody>
                <DialogFooter>
                  <Button size="sm">Отмена</Button>
                  <Button size="sm" variant="primary" onClick={() => toast.success("Выдача отправлена", { description: "Steve_Pro · VIP · 30 дней" })}>
                    Повторить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Sheet>
              <SheetTrigger asChild>
                <Button>Открыть шторку</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Заказ #PMC-10482</SheetTitle>
                  <SheetDescription>6 ноя, 14:05 · СБП · 199 ₽</SheetDescription>
                </SheetHeader>
                <SheetBody>
                  <p className="text-sm text-fg-2">Детали заказа и трассировка доставки.</p>
                </SheetBody>
              </SheetContent>
            </Sheet>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" aria-label="Действия">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Товар</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Pencil /> Редактировать <DropdownMenuShortcut>E</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy /> Дублировать <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>
                  <Trash2 /> Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip content="Выдача ждёт, пока игрок зайдёт на сервер">
              <Button variant="ghost">Наведи</Button>
            </Tooltip>
            <Button variant="outline" onClick={() => toast("Новый заказ", { description: "kotik228 купил Кейс «Легенда» ×3" })}>
              Тост
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-[13px] text-fg-2">
              <Switch defaultChecked /> Автоповтор
            </label>
            <label className="flex items-center gap-2 text-[13px] text-fg-2">
              <Checkbox defaultChecked /> Только онлайн
            </label>
            <Select defaultValue="sbp">
              <SelectTrigger className="w-44" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sbp">СБП</SelectItem>
                <SelectItem value="card">Карта</SelectItem>
                <SelectItem value="mobile">Баланс телефона</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-xs text-fg-3">
              <span>Оборот в месяц</span>
              <span className="font-mono text-fg nums">{rev[0].toLocaleString("ru-RU")} ₽</span>
            </div>
            <Slider value={rev} onValueChange={setRev} min={10000} max={2000000} step={10000} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-2">
          <Tabs defaultValue="a">
            <TabsList>
              <TabsTrigger value="a">Обзор</TabsTrigger>
              <TabsTrigger value="b">Команды</TabsTrigger>
              <TabsTrigger value="c">История</TabsTrigger>
            </TabsList>
            <TabsContent value="a" className="pt-4 text-sm text-fg-2">
              Вкладки-подчёркивания для разделов страницы.
              <Tabs defaultValue="x" className="mt-4">
                <TabsList variant="pill">
                  <TabsTrigger value="x">Все</TabsTrigger>
                  <TabsTrigger value="y">Онлайн</TabsTrigger>
                  <TabsTrigger value="z">Офлайн</TabsTrigger>
                </TabsList>
              </Tabs>
            </TabsContent>
            <TabsContent value="b" className="pt-4 text-sm text-fg-2">
              Команды
            </TabsContent>
            <TabsContent value="c" className="pt-4 text-sm text-fg-2">
              История
            </TabsContent>
          </Tabs>
          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="1">
              <AccordionTrigger>Что будет, если сервер выключен?</AccordionTrigger>
              <AccordionContent>Покупка встанет в очередь и выдастся, как только сервер поднимется и игрок зайдёт.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger>Когда приходят выплаты?</AccordionTrigger>
              <AccordionContent>Каждый день в 12:00 по Москве на карту или по СБП.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </section>
  );
}
