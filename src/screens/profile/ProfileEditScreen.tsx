import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer, Header, Section, Card, Typography, Button, Input } from '@/components';
import { semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useUserStore } from '@/stores/userStore';
import { genId } from '@/utils/format';
import type { User } from '@/types';

const DEFAULT_NAME = '轻盈用户';
const AGE_MIN = 12;
const AGE_MAX = 100;

/**
 * 个人资料：修改昵称与年龄（必填，12–100）
 * 其余字段（身高 / 目标体重等）保持展示，保存时不被覆盖
 */
export function ProfileEditScreen() {
  const navigation = useNavigation();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const updateUser = useUserStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name ?? '');
  const [age, setAge] = useState(user?.age != null ? String(user.age) : '');
  const [errors, setErrors] = useState<{ name?: string; age?: string }>({});

  const validate = (): boolean => {
    const next: { name?: string; age?: string } = {};
    if (!name.trim()) {
      next.name = '请输入昵称';
    }
    const a = parseInt(age, 10);
    if (!age.trim()) {
      next.age = '请输入年龄';
    } else if (Number.isNaN(a) || a < AGE_MIN || a > AGE_MAX) {
      next.age = `年龄需在 ${AGE_MIN}–${AGE_MAX} 之间`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const finalName = name.trim();
    const finalAge = parseInt(age, 10);
    if (user) {
      updateUser({ name: finalName, age: finalAge });
    } else {
      // 首次设置：创建用户档案（默认值，后续可在表单中继续完善）
      const now = new Date().toISOString();
      const newUser: User = {
        id: genId('u'),
        name: finalName,
        gender: 'female',
        birthDate: '',
        age: finalAge,
        height: 0,
        goalWeight: 0,
        goalType: 'lose',
        activityLevel: 'medium',
        cycleEnabled: false,
        createdAt: now,
        updatedAt: now,
      };
      setUser(newUser);
    }
    navigation.goBack();
  };

  return (
    <ScreenContainer scroll>
      <Header title="个人资料" onLeftPress={() => navigation.goBack()} />
      <Section gap={spacing.lg}>
        <Card>
          <View style={{ gap: spacing.lg }}>
            <Input
              label="昵称"
              placeholder={DEFAULT_NAME}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              error={errors.name}
              helper="保存后首页问候语将同步显示新昵称"
            />
            <Input
              label="年龄"
              placeholder="请输入年龄"
              keyboardType="number-pad"
              value={age}
              onChangeText={(t) => {
                setAge(t.replace(/[^0-9]/g, ''));
                if (errors.age) setErrors((e) => ({ ...e, age: undefined }));
              }}
              error={errors.age}
              helper={`必填，${AGE_MIN}–${AGE_MAX} 岁之间`}
            />
          </View>
        </Card>

        {/* 其他档案信息（只读展示，保存时不会改动） */}
        <Card>
          <Typography variant="captionStrong" color="secondary">其他信息</Typography>
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            <InfoRow label="身高" value={user?.height ? `${user.height} cm` : '未设置'} />
            <InfoRow label="目标体重" value={user?.goalWeight ? `${user.goalWeight} kg` : '未设置'} />
          </View>
        </Card>

        <Button title="保存" variant="primary" fullWidth onPress={save} />
      </Section>
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Typography variant="caption" color="tertiary">{label}</Typography>
      <Typography variant="captionStrong" style={{ marginLeft: 'auto', color: semantic.textPrimary }}>
        {value}
      </Typography>
    </View>
  );
}

export default ProfileEditScreen;
